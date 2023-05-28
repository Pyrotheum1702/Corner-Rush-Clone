import { _decorator, AudioClip, AudioSource, BoxCollider2D, Collider2D, color, Component, Contact2DType, director, EPhysics2DDrawFlags, game, Input, input, instantiate, Label, log, math, Node, PhysicsSystem2D, Prefab, Rect, Sprite, SpriteFrame, sys, tween, UIOpacity, UITransform, Vec2, Vec3, view } from 'cc';
const { ccclass, property } = _decorator;

enum ColliderTag {
  REGION = 0,
  WALL = 1,
  POINT = 2
}

enum MoveDirection {
  TOP_LEFT = 0,
  TOP_RIGHT = 1,
  BOTTOM_LEFT = 2,
  BOTTOM_RIGHT = 3
}

enum ClockDirection {
  CLOCKWISE,
  COUNTER_CLOCKWISE
}

class UserData {
  highScore: number
  audio: boolean
}

@ccclass('GameController')
export class GameController extends Component {

  public static instance: GameController = null;

  @property(Node)
  private playerCube: Node = null;
  @property(Number)
  private playerCubeMoveSpeed: number = 1;
  @property(Node)
  private pointCube: Node = null;
  @property(Node)
  private screenTouchCatcher: Node = null;
  @property(Node)
  private gameplayGroup: Node = null;
  @property(Node)
  private resultGroup: Node = null;
  @property(Label)
  private playerScoreLabel: Label = null;
  @property(Label)
  private resultScoreLabel: Label = null;
  @property(Label)
  private resultComplimentLabel: Label = null;
  @property(Sprite)
  private audioSprite: Sprite = null;
  @property(SpriteFrame)
  private audioOnSprite: SpriteFrame = null;
  @property(SpriteFrame)
  private audioOffSprite: SpriteFrame = null;
  @property(Node)
  private gameNameLabel: Node = null;
  @property(Prefab)
  private explodeEffect: Prefab = null;
  @property(AudioSource)
  private audioSource: AudioSource = null;
  @property(AudioClip)
  private turnAudioClip: AudioClip = null;
  @property(AudioClip)
  private pointAudioClip: AudioClip = null;
  @property(AudioClip)
  private dieAudioClip: AudioClip = null;
  @property(AudioClip)
  private endAudioClip: AudioClip = null;

  // property somehow does'nt work for me so i have to do this.
  @property(BoxCollider2D)
  private turnBackwardRegionTopLeftCollider: BoxCollider2D;
  @property(BoxCollider2D)
  private turnBackwardRegionTopRightCollider: BoxCollider2D;
  @property(BoxCollider2D)
  private turnBackwardRegionBottomLeftCollider: BoxCollider2D;
  @property(BoxCollider2D)
  private turnBackwardRegionBottomRightCollider: BoxCollider2D;
  @property(Vec2)
  private startPosition: Vec2 = null;

  private _isAudioOn: boolean = false;

  private playerCurrentScore: number = 0;
  public playerHighScore: number = 0;
  private playerCubeMoveSpeedAtStart: number = 0;

  private isOnStartScreen = false;
  private isOnGameplay: boolean = false;
  private isPointCubeExist: boolean = false;
  private isPlayerCubeAllowedToTurnBackward: boolean = false;
  private shouldPointCubeExist: boolean = false;

  private playerCubeCurrentMoveDirection: ClockDirection;
  private playerCubeCurrentModeDirectionIndex: MoveDirection;

  private pointCubeCurrentPos: Vec2 = null;
  private playerCubeCurrentMoveDirectionVector: Vec2 = null;
  private pointCubeOriginalScale: Vec3 = null;
  private playerCubeMoveDirectionVectors: Vec2[] = [new Vec2(-1, 1), new Vec2(1, 1), new Vec2(-1, -1), new Vec2(1, -1)];
  private pointCubeSpawnPoints: Vec2[] = [new Vec2(166, 166), new Vec2(-166, 166), new Vec2(166, -166), new Vec2(-166, -166)];

  start() {
    GameController.instance = this;
    // debugging

    this.updatePlayerScoreLabel();

    this.pointCubeOriginalScale = this.pointCube.getScale();

    let pCollider = this.playerCube.getComponent(Collider2D);
    //for mobile
    if (sys.isMobile) this.screenTouchCatcher.on(Input.EventType.TOUCH_START, this.onPlayerTouchGameplayScreen, this);
    //for pc
    if (sys.isBrowser) this.screenTouchCatcher.on(Input.EventType.MOUSE_DOWN, this.onPlayerTouchGameplayScreen, this);

    this.playerCubeMoveSpeedAtStart = this.playerCubeMoveSpeed;

    this.turnBackwardRegionTopLeftCollider.on(Contact2DType.END_CONTACT, this.onPlayerCubeLeaveTurnBackwardRegion, this);
    this.turnBackwardRegionTopRightCollider.on(Contact2DType.END_CONTACT, this.onPlayerCubeLeaveTurnBackwardRegion, this);
    this.turnBackwardRegionBottomLeftCollider.on(Contact2DType.END_CONTACT, this.onPlayerCubeLeaveTurnBackwardRegion, this);
    this.turnBackwardRegionBottomRightCollider.on(Contact2DType.END_CONTACT, this.onPlayerCubeLeaveTurnBackwardRegion, this);

    pCollider.on(Contact2DType.BEGIN_CONTACT, this.onPlayerContact, this);

    const localUserData: UserData = JSON.parse(sys.localStorage.getItem('userData'));
    if (localUserData != null) {
      this.isAudioOn = localUserData.audio;
    } else {
      let newUserData = new UserData();
      newUserData.audio = true;
      newUserData.highScore = 0;
      sys.localStorage.setItem('userData', JSON.stringify(newUserData));
    }
  }

  update(deltaTime: number) {

    this.playerCube.angle = this.playerCube.angle % 360

    if (this.isOnGameplay == false) {
      this.playerCube.position = new Vec3(this.startPosition.x, this.startPosition.y);
      this.playerCube.angle += deltaTime * 135;
    }

    if (this.pointCube.active == true) this.pointCube.angle += deltaTime * 135;

    if (this.isOnGameplay == false) return;

    this.movePlayerCubeInItCurrentDirection(deltaTime);

    if (this.shouldPointCubeExist == true) this.pointCube.active = true;
    else this.pointCube.active = false;

    if (this.shouldPointCubeExist) this.pointCube.position = new Vec3(this.pointCubeCurrentPos.x, this.pointCubeCurrentPos.y);
  }

  onLoad() {
    this.isOnStartScreen = true;
  }


  onPlayerTouchGameplayScreen() {

    if (this.isOnStartScreen == true) {
      this.isOnStartScreen = false;
      this.isOnGameplay = true;
      this.shouldPointCubeExist = true;
      let tempRand = Math.round(math.random()) // = 0 or 1
      this.playerCubeCurrentMoveDirection = tempRand
      this.playerCubeCurrentModeDirectionIndex = tempRand
      this.playerCubeCurrentMoveDirectionVector = this.playerCubeMoveDirectionVectors[tempRand]

      tween(this.playerCube).to(0.5, { angle: this.playerCube.angle - this.playerCube.angle % 90 + 45 }).start()
      tween(this.gameNameLabel.getComponent(UIOpacity))
        .to(0.5, { opacity: 0 })
        .call(() => this.gameNameLabel.active = false)
        .start();
      this.spawnPointCubeAtNewPos();

      this.audioSource.playOneShot(this.turnAudioClip);
      return;
    }

    if (this.isOnGameplay == true) {
      this.changePlayerCubeMoveDirection();
    }
  }

  onPlayerCubeLeaveTurnBackwardRegion() {
    this.isPlayerCubeAllowedToTurnBackward = false;
  }

  changePlayerCubeMoveDirection() {
    if (this.isPlayerCubeAllowedToTurnBackward == true) {
      this.playerCubeCurrentMoveDirectionVector = new Vec2(-this.playerCubeCurrentMoveDirectionVector.x, -this.playerCubeCurrentMoveDirectionVector.y);
      this.inversePlayerCubeCurrentDirectionIndex();
      if (this.playerCubeCurrentMoveDirection == ClockDirection.CLOCKWISE) this.playerCubeCurrentMoveDirection = ClockDirection.COUNTER_CLOCKWISE;
      else this.playerCubeCurrentMoveDirection = ClockDirection.CLOCKWISE;

      this.isPlayerCubeAllowedToTurnBackward = false;

      this.audioSource.playOneShot(this.turnAudioClip);
      return;
    }

    if (this.playerCubeCurrentMoveDirection == ClockDirection.CLOCKWISE)
      this.changePlayerCubeCurrentDirectionIndexClockwise();
    else /* COUNTER_CLOCKWISE case */
      this.changePlayerCubeCurrentDirectionIndexCounterClockwise();

    this.playerCubeCurrentMoveDirectionVector = this.playerCubeMoveDirectionVectors[this.playerCubeCurrentModeDirectionIndex as number]

    this.audioSource.playOneShot(this.turnAudioClip);
  }

  inversePlayerCubeCurrentDirectionIndex() {
    if (this.playerCubeCurrentModeDirectionIndex == MoveDirection.TOP_LEFT)
      this.playerCubeCurrentModeDirectionIndex = MoveDirection.BOTTOM_RIGHT;
    else if (this.playerCubeCurrentModeDirectionIndex == MoveDirection.TOP_RIGHT)
      this.playerCubeCurrentModeDirectionIndex = MoveDirection.BOTTOM_LEFT;
    else if (this.playerCubeCurrentModeDirectionIndex == MoveDirection.BOTTOM_RIGHT)
      this.playerCubeCurrentModeDirectionIndex = MoveDirection.TOP_LEFT;
    else if (this.playerCubeCurrentModeDirectionIndex == MoveDirection.BOTTOM_LEFT)
      this.playerCubeCurrentModeDirectionIndex = MoveDirection.TOP_RIGHT;
  }

  changePlayerCubeCurrentDirectionIndexClockwise() {
    if (this.playerCubeCurrentModeDirectionIndex == MoveDirection.TOP_LEFT)
      this.playerCubeCurrentModeDirectionIndex = MoveDirection.TOP_RIGHT;
    else if (this.playerCubeCurrentModeDirectionIndex == MoveDirection.TOP_RIGHT)
      this.playerCubeCurrentModeDirectionIndex = MoveDirection.BOTTOM_RIGHT;
    else if (this.playerCubeCurrentModeDirectionIndex == MoveDirection.BOTTOM_RIGHT)
      this.playerCubeCurrentModeDirectionIndex = MoveDirection.BOTTOM_LEFT;
    else if (this.playerCubeCurrentModeDirectionIndex == MoveDirection.BOTTOM_LEFT)
      this.playerCubeCurrentModeDirectionIndex = MoveDirection.TOP_LEFT;
  }

  changePlayerCubeCurrentDirectionIndexCounterClockwise() {
    if (this.playerCubeCurrentModeDirectionIndex == MoveDirection.TOP_LEFT)
      this.playerCubeCurrentModeDirectionIndex = MoveDirection.BOTTOM_LEFT;
    else if (this.playerCubeCurrentModeDirectionIndex == MoveDirection.BOTTOM_LEFT)
      this.playerCubeCurrentModeDirectionIndex = MoveDirection.BOTTOM_RIGHT;
    else if (this.playerCubeCurrentModeDirectionIndex == MoveDirection.BOTTOM_RIGHT)
      this.playerCubeCurrentModeDirectionIndex = MoveDirection.TOP_RIGHT;
    else if (this.playerCubeCurrentModeDirectionIndex == MoveDirection.TOP_RIGHT)
      this.playerCubeCurrentModeDirectionIndex = MoveDirection.TOP_LEFT;
  }

  onPlayerContact(selfCollider: Collider2D, otherCollider: Collider2D) {
    switch (otherCollider.tag) {
      case ColliderTag.REGION as number:
        this.isPlayerCubeAllowedToTurnBackward = true;
        //
        break;
      case ColliderTag.WALL as number:
        this.onPlayerContactWithWall();
        break;
      case ColliderTag.POINT as number:
        this.onPlayerContactWithPoint();
        break;
    }
  }

  onPlayerContactWithWall() {
    this.isOnGameplay = false;
    this.playerCube.active = false;

    const newEffect = instantiate(this.explodeEffect);

    newEffect.setParent(this.playerCube.getParent())
    newEffect.position = this.playerCube.position;

    this.scheduleOnce(function () {
      newEffect.destroy();
    }, 3);
    this.scheduleOnce(this.onGameOver, 1);

    this.audioSource.playOneShot(this.dieAudioClip);
  }

  onGameOver() {
    const localUserData: UserData = JSON.parse(sys.localStorage.getItem('userData'));
    let localHighScore: number;

    if (localUserData != null) localHighScore = localUserData.highScore;
    else localHighScore = 0;

    if (this.playerCurrentScore > localHighScore) {
      let userData = new UserData();

      userData.audio = localUserData.audio;
      userData.highScore = this.playerCurrentScore;
      GameController.instance.playerHighScore = this.playerCurrentScore;

      sys.localStorage.setItem('userData', JSON.stringify(userData));

      this.resultScoreLabel.color = color(255, 218, 6, 255);
      this.resultComplimentLabel.string = 'new best!'
    } else {
      GameController.instance.playerHighScore = localHighScore;
      this.resultComplimentLabel.string = ''
    }

    this.resultScoreLabel.string = this.playerCurrentScore.toString();

    tween(this.playerScoreLabel.getComponent(UIOpacity)).to(0.7, { opacity: 0 }).start();
    this.scheduleOnce(this.showResult, 0.7);
  }

  showResult() {
    const groupMoveSpeed = 3200; // unit per second
    const screenRect: Rect = view.getViewportRect();

    tween(this.gameplayGroup).to(screenRect.size.y * 2.5 / groupMoveSpeed, { position: new Vec3(0, screenRect.size.y * 2.5, 0) }).start();
    tween(this.resultGroup).to(screenRect.size.y * 2.5 / groupMoveSpeed, { position: new Vec3(0, -1, 0) }).start();

    director.preloadScene('Main');
    this.audioSource.playOneShot(this.endAudioClip);
  }

  onPlayerContactWithPoint() {
    const maxMoveSpeed = 600;
    this.playerCurrentScore += 1
    this.playerCubeMoveSpeed = this.playerCubeMoveSpeedAtStart + Math.floor(this.playerCurrentScore / 5) * this.playerCubeMoveSpeed / 5;
    if (this.playerCubeMoveSpeed > maxMoveSpeed) this.playerCubeMoveSpeed = maxMoveSpeed;

    this.updatePlayerScoreLabel();
    this.spawnPointCubeAtNewPos();
    this.audioSource.playOneShot(this.pointAudioClip);
  }


  updatePlayerScoreLabel() {
    const originalScale: Vec3 = new Vec3(1.25, 1, 1);
    const burstScale: Vec3 = new Vec3(originalScale.x * 1.2, originalScale.y * 1.2, 1);

    if (this.playerCurrentScore > 0) this.playerScoreLabel.string = this.playerCurrentScore.toString();
    else this.playerScoreLabel.string = '';

    this.playerScoreLabel.node.scale = new Vec3(burstScale.x, burstScale.y, 1);
    tween(this.playerScoreLabel.node).to(0.2, { scale: originalScale }).start()
  }


  movePlayerCubeInItCurrentDirection(deltaTime: number) {
    this.playerCube.position = this.playerCube.position.add(new Vec3(
      this.playerCubeCurrentMoveDirectionVector.x * deltaTime * this.playerCubeMoveSpeed,
      this.playerCubeCurrentMoveDirectionVector.y * deltaTime * this.playerCubeMoveSpeed, 0))
  }

  spawnPointCubeAtNewPos() {
    this.isPointCubeExist = true;
    this.pointCube.active = true;

    let newPos = this.pointCubeSpawnPoints[Math.floor(Math.random() * this.pointCubeSpawnPoints.length)];

    if (this.pointCubeCurrentPos != null && this.pointCubeCurrentPos == newPos) {
      this.spawnPointCubeAtNewPos()
      return;
    }
    else this.pointCubeCurrentPos = newPos

    // this.pointCube.position = new Vec3(newPos.x, newPos.y, 0) <- THIS SOMEHOW DOES'NT WORK????


    this.pointCube.scale = Vec3.ZERO
    tween(this.pointCube).to(0.3, { scale: this.pointCubeOriginalScale }).start()
  }

  toggleAudio() {
    if (this.isAudioOn == true) this.isAudioOn = false;
    else this.isAudioOn = true;
  }

  restartGame() {
    director.loadScene('Main');
  }

  exit() {
    game.end();
  }

  get isAudioOn(): boolean {
    return this._isAudioOn;
  }
  set isAudioOn(value: boolean) {
    this._isAudioOn = value;
    if (this._isAudioOn == true) {
      this.audioSource.volume = 1;
      this.audioSprite.spriteFrame = this.audioOnSprite;
    }
    else {
      this.audioSource.stop()
      this.audioSource.volume = 0;
      this.audioSprite.spriteFrame = this.audioOffSprite;
    }

    const localUserData: UserData = JSON.parse(sys.localStorage.getItem('userData'));
    let newUserData = new UserData();
    newUserData.audio = this._isAudioOn;
    newUserData.highScore = localUserData.highScore;

    sys.localStorage.setItem('userData', JSON.stringify(newUserData));
  }
}


