import * as Swipe from 'phaser-swipe';
import { SwipeModel } from '../interfaces/swipe';
import { State } from '../interfaces/state';
import { GameDifficulty, SFX } from '../interfaces/game';
import { GhostName } from '../interfaces/ghost';
import { PillxName } from '../interfaces/pillx';
import { difficulty } from '../config/difficulty';
import { Pill } from '../objects/pill';
import { Portal } from '../objects/portal';
import { Pacman } from '../objects/pacman';
import { Ghost } from '../objects/ghost';
import { Pillx } from '../objects/pillx';
import {
  getObjectsByType,
  getRespawnPoint,
  getTargetPoint
} from '../utils/tilemap.helpers';

/**
 * Main game state.
 */
export class GameState extends State {
  map: Phaser.Tilemap;
  bgLayer: Phaser.TilemapLayer;
  wallsLayer: Phaser.TilemapLayer;
  active: boolean;
  score: number;
  multi: number;
  lifes: number;
  level: number;
  difficlty: GameDifficulty;
  pellets: Phaser.Group;
  pills: Phaser.Group;
  bonuses: Phaser.Group;
  portals: Phaser.Group;
  ghosts: Phaser.Group;
  pillxs: Phaser.Group;
  ghostsHome = new Phaser.Point();
  pacman: Pacman;
  //blinky: Ghost;
  //pinky: Ghost;
  //inky: Ghost;
  //clyde: Ghost;

  pillx1: Pillx;
  pillx2: Pillx;
  pillx3: Pillx;
  pillx4: Pillx;


  controls: Phaser.CursorKeys;
  spaceKey: Phaser.Key;

  swipe: Swipe;
  isTouch: boolean;

  sfx: SFX;
  counter: number;
  max_counter: number;

  text: Phaser.Text;
  timer: Phaser.Timer;
  private interface: Phaser.Group;
  private lifesArea: Phaser.Sprite[] = [];
  private scoreBtm: Phaser.BitmapText;
  private notification: Phaser.BitmapText;
  private notificationIn: Phaser.Tween;
  private notificationOut: Phaser.Tween;

  constructor() {
    super();

    this.onPowerModeStart = this.onPowerModeStart.bind(this);
    this.onPowerModeEnd = this.onPowerModeEnd.bind(this);
  }

  init(level = 1, lifes = 1, score = 0) {
    this.isTouch = this.game.device.touch;
    this.level = level;
    this.lifes = lifes;
    this.score = score;
    this.difficlty = difficulty[this.level - 1];
    this.multi = this.difficlty.multiplier;
    this.active = true;
    this.max_counter = 60;
    this.counter = this.max_counter;
    //this.text=0;
  }
  render() {
    if (this.active)
      this.game.debug.text('Tiempo restante: ' + this.counter + ' segundos', 82, 42);

  }

  create() {
    this.setTiles();
    this.initLayers();
    this.resizeMap();

    this.enablePhysics();
    this.setControls();
    //this.createButton();
    this.createTimer();
    this.createPortals();
    this.createPellets();
    // this.createPills();
    this.createPillxs();
    this.createGhosts();
    this.createPacman();
   
    this.initUI();
    this.initSfx();

    this.sfx.intro.play();
  }

  createTimer() {
    this.game.stage.backgroundColor = '#000';

    //  Create our Timer
    this.timer = this.game.time.create(false);

    //  Set a TimerEvent to occur after 2 seconds
    this.timer.loop(1000, this.updateCounter, this);

    //  Start the timer running - this is important!
    //  It won't start automatically, allowing you to hook it to button events and the like.
    // this.timer.start();

  }

  updateCounter() {
    if (this.active) {
      this.counter--;
      // Ghost eats Pacman.
      if (this.counter < 0) {
        this.counter = 0;
        this.pillxs.callAll('stop', undefined);
        this.updateLifes(-1);

        // Game over.
        console.log(this.lifes);
        if (this.lifes === 0) {
          this.pacman.sfx.munch.stop();
          this.sfx.over.play();
          this.active = false;
        //  this.pacman.die();
          this.showNotification('Perdiste intente nuevamente.');
          this.game.state.start("the_state_name");
        }
        else {
          // Minus 1 Pacman life.
          this.counter = this.max_counter;
          this.pacman.die();
          this.ghosts.callAll('respawn', undefined);
        }
      }
    }


    //this.text.setText('Counter: ' + this.counter);

  }
  update() {
    // Check if game is active.
    if (!this.active) {
      this.ghosts.callAll('stop', undefined);
      this.pacman.stop();

      // Restarts state on win/game over or Pacman death.
      if ((this.spaceKey && this.spaceKey.isDown) ||
        (this.input.pointer1 && this.input.pointer1.isDown)) {
        // Game over.
        if (this.lifes === 0) {
          this.game.state.start('Game', true, false);
        } else if (this.level <= 3) { // Next level.
          this.game.state.start('Game', true, false, this.level, this.lifes + 1, this.score);
        } else {
          this.game.state.start('Game', true, false); // Win.
        }
      }

      return;
    }

    // Checks collisions.
    this.game.physics.arcade.collide(this.pacman, this.wallsLayer);
    this.game.physics.arcade.collide(this.ghosts, this.wallsLayer);
    this.game.physics.arcade.collide(this.pillxs, this.wallsLayer);

    // Checks overlappings.
    this.game.physics.arcade.overlap(this.ghosts, this.portals, this.teleport, null, this);
    this.game.physics.arcade.overlap(this.pacman, this.portals, this.teleport, null, this);
    this.game.physics.arcade.overlap(this.pacman, this.pellets, this.collect, null, this);
    //this.game.physics.arcade.overlap(this.pacman, this.bonuses, this.bonus, null, this);
    //this.game.physics.arcade.overlap(this.pacman, this.pills, this.powerMode, null, this);
    //this.game.physics.arcade.overlap(this.pacman, this.ghosts, this.meetGhost, null, this);
    this.game.physics.arcade.overlap(this.pacman, this.pillxs, this.collect, null, this);

    // Upgates objects positions.
    this.ghosts.callAll('updatePosition', undefined, this.map, this.wallsLayer.index);
    this.ghosts.callAll('updateTarget', undefined, this.pacman.marker);


    this.pillxs.callAll('updatePosition', undefined, this.map, this.wallsLayer.index);
    this.pillxs.callAll('updateTarget', undefined, this.pacman.marker);

    if (this.game.time.events.duration > 0 &&
      this.game.time.events.duration < this.difficlty.powerModeTime * 0.3) {
      this.ghosts.callAll('normalSoon', undefined);
      this.pillxs.callAll('normalSoon', undefined);
    }

    this.pacman.updatePosition(this.map, this.wallsLayer.index);

    this.checkControls();
  }

  /**
   * Update controls handler.
   */
  checkControls() {
    if (this.isTouch) {
      this.swipeControls();
    } else {
      this.keyboardControls();
    }

    if (this.pacman.turning !== Phaser.NONE) {
      this.pacman.turn();
    }
  }

  /**
   * Keyboard handler.
   */
  keyboardControls() {
    if (this.controls.left.isDown) {
      this.pacman.onControls(Phaser.LEFT);
    } else if (this.controls.right.isDown) {
      this.pacman.onControls(Phaser.RIGHT);
    } else if (this.controls.up.isDown) {
      this.pacman.onControls(Phaser.UP);
    } else if (this.controls.down.isDown) {
      this.pacman.onControls(Phaser.DOWN);
    } else {
      this.pacman.turning = Phaser.NONE;
    }
  }

  /**
   * Touch handler.
   */
  swipeControls() {
    const direction = this.swipe.check();

    if (direction !== null) {
      switch (direction.direction) {
        case this.swipe.DIRECTION_LEFT:
          this.pacman.onControls(Phaser.LEFT);
          break;

        case this.swipe.DIRECTION_RIGHT:
          this.pacman.onControls(Phaser.RIGHT);
          break;
        case this.swipe.DIRECTION_UP:
          this.pacman.onControls(Phaser.UP);
          break;

        case this.swipe.DIRECTION_DOWN:
          this.pacman.onControls(Phaser.DOWN);
          break;

        default:
          this.pacman.turning = Phaser.NONE;
          break;
      }
    }
  }

  /**
   * Inits map portals.
   */
  createPortals() {
    this.portals = this.game.add.group();
    this.portals.enableBody = true;

    const portals = getObjectsByType('portal', this.map, 'objects');

    portals.forEach(p => {
      this.portals
        .add(new Portal(this.game, p.x, p.y, p.width, p.height, p.properties));
    });
  }

  /**
   * Inits pellets.
   */
  createPellets() {
    this.pellets = this.game.add.group();
    this.pellets.enableBody = true;

    this.bonuses = this.game.add.group();
    this.bonuses.enableBody = true;

    this.map.createFromObjects('objects', 7, 'pellet', 0, true, false, this.pellets);
  }

  /**
   * Inits pills.
   */
  createPills() {
    this.pills = this.game.add.group();
    this.pills.enableBody = true;

    const pills = getObjectsByType('pill', this.map, 'objects');

    pills.forEach(p => {
      //this.pills.add(new Pill(this.game, p.x, p.y,10,100));
      this.pills.add(new Pill(this.game, p.x, p.y));
    });
  }
  /**
     * Inits Ghosts.
     */
  createPillxs() {
    this.pillxs = this.game.add.group();
    this.pillxs.enableBody = true;
    //  this.ghostsHome = getRespawnPoint('blinky', this.map);

    this.addPillxByName('pillx1');
    this.addPillxByName('pillx2');
    this.addPillxByName('pillx3');
    this.addPillxByName('pillx4');



  }

  /**
   * Inits Ghosts.
   */
  createGhosts() {
    this.ghosts = this.game.add.group();
    this.ghosts.enableBody = true;
    //  this.ghostsHome = getRespawnPoint('blinky', this.map);

    //this.addGostByName('blinky');
    //this.addGostByName('inky');
    //this.addGostByName('pinky');
    //this.addGostByName('clyde');
    const respawn = getRespawnPoint('blinky', this.map);
    const target = getTargetPoint('blinky', this.map);



  }

  /**
   * Inits Pacman.
   */
  createPacman() {
    const respawn = getRespawnPoint('pacman', this.map);

    this.pacman = new Pacman(this.game, respawn.x, respawn.y,
      this.game.tileSize, this.difficlty.pacmanSpeed);

    this.pacman.afterStart(() => this.afterPacmanRun());
  }

  /**
   * Pacman start hook.
   */
  afterPacmanRun() {
    this.sfx.intro.stop();
    // this.blinky.onStart();
    this.pillx1.onStart();
    this.pillx2.onStart();
    this.pillx3.onStart();
    this.pillx4.onStart();
    this.timer.start();
    // this.pinky.escapeFromHome(800);
    //this.inky.escapeFromHome(1000);
    //this.clyde.escapeFromHome(1200);
  }

  /**
   * Portals handler.
   * @param unit - ghost or pacman to teleport.
   * @param portal - portal object.
   */
  teleport(unit: Pacman | Ghost, portal: Portal) {
    const { x, y } = this.portals
      .filter(p => p.props.i === portal.props.target)
      .list[0];

    unit.teleport(portal.x, portal.y, x, y);
  }

  /**
   * Munch handler.
   * @param pacman - pacman object.
   * @param item - pill or pellet to collect.
   */
  collect(pacman: Pacman, item) {
    const points = {
      pellet: 0,
      pill: 0,
      pillx1: 1000,
      pillx2: 1000,
      pillx3: 1000,
      pillx4: 1000
    }[item.key] || 0;


    if (item.key == 'pillx1' || item.key == 'pillx2' || item.key == 'pillx3' || item.key == 'pillx4')
      this.sfx.win.play();
    item.kill();

    this.updateScore(points);





    // All items eaten by Pacman.
    if (!this.pillxs.total) {
      pacman.sfx.munch.stop();
      const nextLevel = this.level < 1;
      const text = nextLevel ? `nivel ${this.level} completado` : 'juego completado';
      this.level++;
      this.active = false;
      this.ghosts.callAll('stop', undefined);

      if (!nextLevel) {
        this.sfx.win.play();
      }

      this.showNotification(text);
    }

    /*else { // Bonuses initialization.
      const eated = `${this.pellets.children.length - this.pellets.total}`;

      const bonusName = {
        '60': 'cherry',
        '120': 'strawberry',
        '150': 'apple'
      }[eated];

      if (bonusName) {
        this.placeBonus(bonusName);
      }
    }*/
  }

  /**
   * Bonus eat handler.
   * @param pacman - pacman object.
   * @param bonus - friut.
   */
  bonus(pacman: Pacman, bonus) {
    const amount = {
      'cherry': 2,
      'strawberry': 3,
      'apple': 4
    }[bonus.key] || 1;

    bonus.destroy();
    this.sfx.fruit.play();

    this.multi = this.multi * amount;

    this.time.events.add(3000, () => {
      this.multi = this.difficlty.multiplier;
    });
  }

  /**
   * Pill eat handler.
   * @param pacman - pacman object.
   * @param pill - power pill.
   */
  powerMode(pacman: Pacman, pill: Pill) {
    this.collect(pacman, pill);

    pacman.enablePowerMode(this.difficlty.powerModeTime,
      this.onPowerModeStart, this.onPowerModeEnd);
  }

  /**
   * Pacman power mode start hook.
   */
  onPowerModeStart() {
    this.sfx.intermission.play();
    this.ghosts.callAll('enableSensetiveMode', undefined);
  }

  /**
   * Pacman power mode end hook.
   */
  onPowerModeEnd() {
    this.sfx.intermission.stop();
    this.sfx.regenerate.play();
    this.ghosts.callAll('disableSensetiveMode', undefined);
  }

  /**
   * Ghost overlap handler.
   * @param pacman - pacman object.
   * @param ghost - ghost object.
   */
  meetGhost(pacman: Pacman, ghost: Ghost) {
    // Prevent multiple overlaps.
    if (!pacman.alive || !ghost.alive) {
      return;
    }

    // Pacman powerfull.
    if (ghost.mode === 'frightened' && pacman.mode === 'power') {
      ghost.die();
      this.updateScore(200);
    } else {
      // Ghost eats Pacman.
      this.ghosts.callAll('stop', undefined);
      this.updateLifes(-1);

      // Game over.
      if (this.lifes === 0) {
        pacman.sfx.munch.stop();
        this.sfx.over.play();
        this.active = false;
        this.showNotification('game over');
      } else {
        // Minus 1 Pacman life.
        pacman.die();
        this.ghosts.callAll('respawn', undefined);
      }
    }
  }

  /**
   * Creates map.
   */
  private setTiles() {
    this.map = this.game.add.tilemap('level');
    this.map.addTilesetImage('walls', 'walls');
    this.map.setCollisionBetween(1, 33, true, 'walls');
  }

  /**
   * Gets random pellet position on map.
   */
  private getRandomPelletPosition(): Phaser.Point {
    const { x, y } = this.pellets
      .children[this.rnd.integerInRange(0, this.pellets.children.length - 1)];

    return { x, y } as Phaser.Point;
  }

  /**
   * Puts fruit on map.
   * @param name - fruit name.
   */
  private placeBonus(name: 'string') {
    const rndPoint = this.getRandomPelletPosition();
    this.add.sprite(rndPoint.x, rndPoint.y, name, 0, this.bonuses);
  }

  /**
   * Creates layers.
   */
  private initLayers() {
    this.bgLayer = this.map.createLayer('background');
    this.wallsLayer = this.map.createLayer('walls');
  }

  /**
   * Resises map.
   */
  private resizeMap() {
    this.bgLayer.resizeWorld();
  }

  /**
   * Enables physics.
   */
  private enablePhysics() {
    this.game.physics.startSystem(Phaser.Physics.ARCADE);
  }

  /**
   * Creates user interface.
   */
  private initUI() {
    this.interface = this.game.add.group();

    const text = this.score === 0 ? '00' : `${this.score}`;
    this.scoreBtm = this.game.make.bitmapText(this.game.world.centerX, 16, 'kong', text, 16);
    this.scoreBtm.anchor.set(0.5);
    this.notification = this.game.make.bitmapText(
      this.game.world.centerX,
      this.game.world.centerY + 48, 'kong', '', 16);
    this.notification.anchor.set(0.5);
    this.notification.alpha = 0;
    this.notificationIn = this.game.add.tween(this.notification)
      .to({ alpha: 1 }, 300, 'Linear');
    this.notificationOut = this.game.add.tween(this.notification)
      .to({ alpha: 0 }, 300, 'Linear');

    this.interface.add(this.scoreBtm);
    this.interface.add(this.notification);
    this.updateLifes(0);
  }

  /**
   * Updates player scores.
   * @param points - points to add.
   */
  private updateScore(points: number) {
    this.score += points * this.multi;
    this.scoreBtm.text = `${this.score}`;
  }

  /**
   * Updates player lifes.
   * @param amount - number of lifes.
   */
  private updateLifes(amount: number) {
    this.lifes += amount;

    // Create if no in UI.
    if (this.lifesArea.length &&
      this.lifesArea.length > this.lifes) {
      const life = this.lifesArea.pop();
      const lifeTween = this.game.add.tween(life)
        .to({ alpha: 0 }, 300, 'Linear');

      lifeTween.onComplete.add(() => life.destroy());
      lifeTween.start();
    } else {
      // Update UI.
      let sprite: Phaser.Sprite;
      let prevSprite: Phaser.Sprite;

      for (let i = 0; i < this.lifes; i++) {
        if (prevSprite) {
          sprite = this.add.sprite(0, 0, 'pacman', 1)
            .alignTo(prevSprite, Phaser.RIGHT_CENTER, 8, 0);
        } else {
          sprite = this.add.sprite(8, this.game.world.bottom - 24, 'pacman', 1);
        }

        this.lifesArea.push(sprite);
        prevSprite = sprite;
      }
    }
  }

  /**
   * Shows game notification.
   * @param text - notification text.
   */
  private showNotification(text: string) {
    this.notification.text = text.toUpperCase();
    this.notificationIn.start();
  }

  /**
   * Hides game notification.
   */
  private hideNotification() {
    this.notification.text = '';
    this.notificationOut.start();
  }

  /**
   * Inits music & sounds.
   */
  private initSfx() {
    this.sfx = {
      intro: this.add.audio('intro'),
      over: this.add.audio('over'),
      win: this.add.audio('win'),
      fruit: this.add.audio('fruit'),
      intermission: this.add.audio('intermission'),
      regenerate: this.add.audio('regenerate')
    };
  }

  /**
   * Set game controls.
   */
  private setControls() {
    if (this.isTouch) {
      this.swipe = new Swipe(this.game, SwipeModel);
    } else {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
      this.controls = this.input.keyboard.createCursorKeys();
    }
  }

  /**
   * Creates new ghost object by name.
   * @param name - ghost name.
   */
  private addGostByName(name: GhostName) {
    const respawn = getRespawnPoint(name, this.map);
    const target = getTargetPoint(name, this.map);

    this[name] = new Ghost(this.game, respawn.x, respawn.y, name, 2, this.game.tileSize,
      this.difficlty.ghostSpeed, target, this.ghostsHome, this.difficlty.wavesDurations);
    this.ghosts.add(this[name]);
  }


  private addPillxByName(name: PillxName) {
    const respawn = getRespawnPoint(name, this.map);
    const target = getTargetPoint(name, this.map);

    this[name] = new Pillx(this.game, respawn.x, respawn.y, name, 2, this.game.tileSize,
      this.difficlty.ghostSpeed, target, this.ghostsHome, this.difficlty.wavesDurations);

   
    this.pillxs.add(this[name]);
    
  }
}
