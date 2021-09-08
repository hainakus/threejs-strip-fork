import type * as THREE from 'three'
import type { Curve, RadiusFn, TiltFn, UvFn, Morph, Frame } from './Ty'
import * as Err from './Err'
import { StripHelperGen } from './StripHelperGen'
import { CrvGen } from './CrvGen'

// ----
// Defaults
// ----

const RADIUS = 0.5;
const TILT = 0;
const UV = null;

// ----
// Strip
// ----

export class Strip {

  static #THREE: null | typeof THREE = null;
  static #Helper: null | ReturnType<typeof StripHelperGen>;
  static #Crv: null | ReturnType<typeof CrvGen>;

  /**
   * threejs lib
   */
  static get THREE() { return Strip.#THREE }
  static set THREE(x: null | typeof THREE) {
    Strip.#THREE = x;
    if (x) {
      Strip.#Helper = StripHelperGen(x);
      Strip.#Crv = CrvGen(x);
    } else {
      Strip.#Helper = null;
      Strip.#Crv = null;
    }
  }

  /**
   * A helper showing TBN frames for each sample point. 
   */
  static get Helper() {
    if (!this.#Helper) {
      throw new Err.DependencyInjectionError();
    }
    return this.#Helper;
  }

  /**
   * Practical uv fn set.
   */
  static UvFns: [UvFn, UvFn, UvFn, UvFn] = [
    (i, I) => [0, i / I, 1, i / I], // uv frame = (-Binormal, Tangent)
    (i, I) => [i / I, 1, i / I, 0], // rot 90d 
    (i, I) => [1, 1 - i / I, 0, 1 - i / I], // rot 180d
    (i, I) => [1 - i / I, 0, 1 - i / I, 1], // rot 270d 
  ];

  #crv: null | Curve;
  #seg: number;
  #r: number | RadiusFn = RADIUS;
  #tilt: number | TiltFn = TILT;
  #uv: null | UvFn;
  #mrps: null | Morph[];
  #geom: null | THREE.BufferGeometry;
  #frms: null | Frame[];
  #rFn: null | RadiusFn = () => RADIUS;
  #tiltFn: null | TiltFn = () => TILT;
  #disposed = false;

  /**
   * Generate Strip.
   * 
   * @param crv A curve that determines the flow of strip
   * @param seg Number of divisions used to sample the curve
   * @param r Radius ( strip breadth is 2r ), default is `0.5`
   * @param tilt Roll around tangent, default is `0`, in radian 
   * @param uv Uv generator fn, default is `null`
   */
  constructor(
    crv: Curve,
    seg: number,
    r: number | RadiusFn = RADIUS,
    tilt: number | TiltFn = TILT,
    uv: null | UvFn = UV,
  ) {
    if (!Strip.#THREE) {
      throw new Err.DependencyInjectionError();
    }
    this.#crv = crv;
    this.#seg = seg;
    this.#setR(r);
    this.#setTilt(tilt);
    this.#uv = uv;
    this.#mrps = null;
    this.#geom = null;
    this.#frms = null;
    this.#geom = new Strip.#THREE.BufferGeometry();
    this.#update();
  }

  /**
   * Set #r and gen wrapper fn if needed. Pass `NaN` to kill that fn.
   * @param x value(/fn) of radius 
   */
  #setR(x: number | RadiusFn) {
    this.#r = x;
    this.#rFn = typeof x == 'function' ? x : isNaN(x) ? null : () => x;
  }

  /**
   * Set #tilt and gen wrapper fn if needed. Pass `NaN` to kill that fn.
   * @param x value(/fn) of tilt
   */
  #setTilt(x: number | TiltFn) {
    this.#tilt = x;
    this.#tiltFn = (typeof x == 'function') ? x : isNaN(x) ? null : () => x;
  }

  /**
   * A curve to determine strip flow.
   */
  get curve() {
    return this.#crv;
  }

  set curve(x: null | Curve) {
    this.#crv = x;
    this.#update();
  }

  /**
   * Number of divisions; larger the value, smoother the strip.
   * Value must be an integer greater than 0.
   */
  get segment() {
    return this.#seg;
  }

  set segment(x: number) {
    this.#seg = Math.max(1, x | 0); // int(x); min=1 
    this.#update();
  }

  /**
   * Radius; determine the strip breadth ( which is 2 * radius ).
   */
  get radius() {
    return this.#r;
  }

  set radius(x: number | RadiusFn) {
    if (x !== this.#r) {
      this.#setR(x);
      this.#update();
    }
  }

  /**
   * Tilt; determine twisting ( around tangent )
   */
  get tilt() {
    return this.#tilt;
  }

  set tilt(x: number | TiltFn) {
    if (x !== this.#tilt) {
      this.#setTilt(x);
      this.#update();
    }
  }

  /**
   * A fn to generate texcoords. It must return array of 4 numbers
   * representing two uv pairs `[u0,v0, u1,v1]` for +ve handle and 
   * -ve handle at sample point #i correspondingly.
   * 
   * Each sample point has two handles which span across +-binormal.
   * The 1st handle refers to the one at +ve binormal.
   * 
   * @example
   * ```js
   * const uv = (i, I) => [0, i/I, 1, i/I]
   * const strip = new Strip(curve, 10, 0.5, 0, uv);
   * ```
   * 
   * There're few predefined uv fns at `String.UvFns`.
   * see https://ycw.github.io/three-strip/examples/uv/
   * 
   * @example
   * ```js
   * const strip = new Strip(curve, 10, 0.5, 0, Strip.UvFns[0]);
   * ```
   */
  get uv() {
    return this.#uv;
  }

  set uv(x: null | UvFn) {
    if (this.#uv === x) return;
    this.#uv = x;
    if (x) this.#update();
    else this.#geom?.deleteAttribute('uv');
  }

  /**
   * Indexed `BufferGeometry`. 
   */
  get geometry() {
    return this.#geom;
  }

  /**
   * Array of RHand TBN frames. 
   * 
   * A frame is in form of `[T,B,N]` where TBN are `Vector3`s.
   * 
   * @example
   * ```js
   * strip.frames[0][0] // 1st frame's tangent
   * strip.frames[0][1] // 1st frame's binormal
   * strip.frames[0][2] // 1st frame's normal 
   * ```
   */
  get frames() {
    return this.#frms;
  }

  /**
   * Set morphs.
   * 
   * A morph is in form `{ curve, radius, tilt }`
   * 
   * Pass `null` will delete all morph attributes from geometry.  
   * 
   * This fn skips eqaulity checking:
   * 
   * @example 
   * ```js
   * const arr = [{ curve: c1 }]
   * strip.setMorphs(arr)
   * 
   * // mutate arr ( strip will not auto-update )
   * arr.push({ curve: c2 }) 
   * 
   * // pass same arr ref ( strip is updated to have 2 morphs )
   * strip.setMorphs(arr)
   * ```
   * 
   * @param mrps Array of morphs
   */
  setMorphs(
    mrps: null | Morph[]
  ) {
    this.#mrps = mrps;
    this.#update();
  }

  setProps(
    crv: null | Curve = this.#crv,
    seg: number = this.#seg,
    r: number | RadiusFn = this.#r,
    tilt: number | TiltFn = this.#tilt,
    uv: null | UvFn = this.#uv
  ) {

    const bCrv = this.#crv !== crv;
    if (bCrv) this.#crv = crv;

    const bSeg = this.#seg !== seg;
    if (bSeg) this.#seg = seg;

    const bR = this.#r !== r;
    if (bR) this.#setR(r);

    const bTilt = this.#tilt !== tilt;
    if (bTilt) this.#setTilt(tilt);

    const bUv = (this.#uv !== uv) && !!uv; // uv is fn -> true
    if (!uv) {
      this.geometry?.deleteAttribute('uv');
    }
    this.#uv = uv;

    if (bCrv || bSeg || bR || bTilt || bUv) {
      this.#update();
    }
  }

  /**
   * Dispose geometry and delete frames.
   */
  dispose() {
    if (this.#disposed) return;
    this.#crv = null;
    this.#seg = 1; // semantics ( min=1 )
    this.#setR(NaN);
    this.#setTilt(NaN);
    this.#uv = null;
    this.#mrps = null;
    this.#geom?.dispose();
    this.#geom = null;
    this.#frms = null;
    this.#disposed = true;
  }

  /**
   * Check if strip has disposed ( i.e. called `.dispose()` ).
   */
  get isDisposed() {
    return this.#disposed;
  }

  /**
   * Rebuild internal geometry based on current states.
   * 
   * If #crv ( base curve ) is falsy, then all morph attributes will reset. 
   */
  #update() {

    // guard ( missing 3js or strip is disposed )

    if (!Strip.THREE || this.isDisposed) return;

    // dispose old geom ( buffer attribs )

    this.#geom!.dispose();

    // cache

    const $ = Strip.THREE;
    const $g = this.#geom!;

    // re alloc

    const aPo = new $.Float32BufferAttribute(6 * (this.#seg + 1), 3);
    $g.setAttribute('position', aPo);

    const aNo = new $.Float32BufferAttribute(6 * (this.#seg + 1), 3);
    $g.setAttribute('normal', aNo);

    const idxs: number[] = [];

    if (this.#uv) $g.setAttribute('uv',
      new $.Float32BufferAttribute(4 * (this.#seg + 1), 2));
    const aUv = $g.getAttribute('uv');

    $g.morphAttributes.position = [];
    $g.morphAttributes.normal = [];

    // guard ( missing #crv )

    if (!this.#crv) {
      this.#geom = null;
      this.#frms = null;
      return;
    }

    // Rhand TBN

    this.#frms ??= [];
    this.#frms.length = this.#seg;
    const frms = this.#frms;

    // cache

    const $v0 = new $.Vector3();
    const $v1 = new $.Vector3();
    let $i = -1;
    let $r = NaN;
    let $tilt = NaN;

    // base curve

    Strip.#Crv!.prototype.forEachTBN.call(
      this.#crv,
      this.#seg,
      (i, I) => i / I,
      (i, I, [T, B, N], P) => {

        // attrib position

        $r = this.#rFn!(i, I);
        $tilt = this.#tiltFn!(i, I);
        frms[i] ??= [$v0, $v0, $v0] // stubs ( pass tsc )
        frms[i][0] = T;
        frms[i][1] = $tilt ? N.applyAxisAngle(T, $tilt) : N;
        frms[i][2] = $tilt ? B.applyAxisAngle(T, $tilt) : B;
        $v0.copy(frms[i][1]).multiplyScalar($r).add(P);
        $v1.copy(frms[i][1]).multiplyScalar(-$r).add(P);
        (aPo.array as Float32Array).set([
          $v0.x, $v0.y, $v0.z,
          $v1.x, $v1.y, $v1.z
        ], i * 6);

        // index data

        //  2---3    ^^^^
        //  |\  |    flow
        //  | \ |    ^^^^
        //  0---1    ^^^^

        if (i < I) {
          idxs.push(
            ($i = i * 2), $i + 1, $i + 2, // tri (0,1,2)
            $i + 2, $i + 1, $i + 3 // tri (2,1,3)
          )
        }

        // uv

        if (this.#uv) {
          (aUv.array as Float32Array).set(this.#uv(i, I), i * 4);
        }
      }
    );

    // set index

    $g.setIndex(idxs);

    // normals

    if (this.#seg === 1) {
      $v0.addVectors(frms[0][2], frms[1][2]).divideScalar(2);
      (aNo.array as Float32Array).set([
        $v0.x, $v0.y, $v0.z,
        $v0.x, $v0.y, $v0.z,
        $v0.x, $v0.y, $v0.z,
        $v0.x, $v0.y, $v0.z,
      ]);
    } else { // #seg > 1
      for (const [i, frm] of frms.entries()) {
        if (i === 0 || i === frms.length - 1) {
          (aNo.array as Float32Array).set([
            frm[2].x, frm[2].y, frm[2].z,
            frm[2].x, frm[2].y, frm[2].z
          ], i * 6);
        } else {
          $v0.addVectors(frms[i - 1][2], frm[2])
            .add(frms[i + 1][2])
            .divideScalar(3);
          (aNo.array as Float32Array).set([
            $v0.x, $v0.y, $v0.z,
            $v0.x, $v0.y, $v0.z
          ], i * 6);
        }
      }
    }

    // morph

    if (this.#mrps) {
      for (const { curve, radius, tilt } of this.#mrps) {
        const { geometry: g } = new Strip(
          curve,
          this.#seg,
          radius ?? RADIUS,
          tilt ?? TILT
        );
        $g.morphAttributes.position.push(g!.getAttribute('position'));
        $g.morphAttributes.normal.push(g!.getAttribute('normal'));
      }
    }

  }
}