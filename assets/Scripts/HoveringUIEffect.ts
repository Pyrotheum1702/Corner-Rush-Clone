import { _decorator, Component, log, math, Node, random, tween, Vec2, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('HoveringUIEffect')
export class HoveringUIEffect extends Component {
  @property(Boolean)
  private isActive: boolean = true;
  @property(Number)
  private offsetValue: number = 0;
  @property(Number)
  private cycleDuration: number = 1;

  private posAtStart: Vec3 = new Vec3();
  private currentMoveDirection: number = 0;

  start() {
    this.posAtStart = new Vec3(this.node.position.x, this.node.position.y, this.node.position.z);
    if (math.randomRangeInt(0, 2) == 1)
      this.currentMoveDirection = 1;
    else
      this.currentMoveDirection = -1;
  }

  update(deltaTime: number) {
    if (this.isActive == false) return;

    if (this.currentMoveDirection == 1
      && this.node.position.y >= this.posAtStart.y + this.offsetValue)
      this.currentMoveDirection = -1;
    else if (this.currentMoveDirection == -1
      && this.node.position.y <= this.posAtStart.y - this.offsetValue)
      this.currentMoveDirection = 1;

    this.node.position =
      new Vec3(
        this.node.position.x,
        this.node.position.y + deltaTime * this.offsetValue * 2 / this.cycleDuration * this.currentMoveDirection,
        this.node.position.z)
  }
}


