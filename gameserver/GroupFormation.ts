// Formation Class
import SAT from "sat";
import { SoldierState } from "./schema/SoldierState";
export class GroupFormation {
  private soldierObjects: SoldierState[];
  private leader: SoldierState;
  private boundingBox: SAT.Box;
  readonly offset: number;
  private soldierOffsets: Map<string, SAT.Vector>;
  constructor(
    soldierObjects: SoldierState[],
    offset: number,
    boundingBox: SAT.Box
  ) {
    this.soldierObjects = soldierObjects;
    this.boundingBox = new SAT.Box();
    this.leader = soldierObjects?.[0];
    this.soldierOffsets = new Map<string, SAT.Vector>();
    this.boundingBox = boundingBox;
    this.offset = offset;
  }
  calculatePositions(userClickPos: SAT.Vector) {
    const matrixRows = Math.ceil(Math.sqrt(this.soldierObjects.length));
    const boundingBoxWidth = matrixRows * this.offset;
    const boundingBoxHeight = boundingBoxWidth;
    // move bounding box of group so that userClickPos is at center
    const translateBox = new SAT.Vector()
      .add(new SAT.Vector(userClickPos.x, userClickPos.y))
      .add(new SAT.Vector(-boundingBoxWidth, -boundingBoxHeight))
      .add(new SAT.Vector(this.offset / 2, this.offset / 2));

    const formationBoundingBox = new SAT.Box(
      new SAT.Vector(),
      boundingBoxWidth,
      boundingBoxHeight
    )
      .toPolygon()
      .translate(translateBox.x, translateBox.y);

    const groupCenterPos = formationBoundingBox.getCentroid();
    let gridBottomRight = formationBoundingBox.points.at(3);
    this.soldierOffsets = new Map<string, SAT.Vector>();

    // calculate offset for each soldier
    this.soldierObjects.forEach((soldier, i) => {
      const row = Math.floor(i / matrixRows) * this.offset;
      const col = (i % matrixRows) * this.offset;
      this.soldierOffsets.set(soldier.id, new SAT.Vector(col, row));
      const targetPos = groupCenterPos.clone().add(new SAT.Vector(col, row));
      soldier.setTargetPosition(targetPos);
    });
  }
}