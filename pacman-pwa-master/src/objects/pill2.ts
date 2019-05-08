import { PacmanGame } from '../';
import { Z_DEFAULT_STRATEGY } from 'zlib';
import { TurningObject } from './turning';
/**
 * Pellet object.
 */
export class Pill2 extends TurningObject {
  private timer: Phaser.Timer = this.game.time.create(false);
 // private currentSpeed: number;

  constructor(game: PacmanGame,
              x: number,
              y: number , 
              tileSize: number,
              speed: number) {
   

    super(game, x - game.tileSize / 2, y - game.tileSize / 2, 'pill',0, tileSize, speed, 16);

    

  }

  /**
   * Setup object physics.
   */
 /* physics() {
    this.game.physics.arcade.enable(this);
    this.body.setSize(16, 16, 0, 0);
    this.body.immovable = false;
    this.anchor.set(0.5);
  }
*/
  onStart() {
    this.initTimer();
   // this.inGame = true;
   // this.enableScatterMode();
    this.move(Phaser.LEFT);
  }

  private initTimer() {
    this.timer.destroy();
    this.timer = this.game.time.create(false);
  }

   
}
