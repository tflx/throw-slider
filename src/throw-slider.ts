import { css, html, LitElement } from "lit"
import {
  customElement,
  property,
  queryAssignedElements,
  state,
} from "lit/decorators.js"
import gsap from "gsap"
import { Draggable } from "gsap/Draggable"
import { InertiaPlugin } from "gsap/InertiaPlugin"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { createRef, ref } from "lit/directives/ref.js"

interface ThrowSliderOptions {
  carouselWrapper: HTMLElement
  carouselItems: Array<HTMLElement>
  speed: number
  paused: boolean
  draggable: boolean
  onChange?: Function
  repeat: number
  throwResistance: number
  center: boolean
  snap: boolean
  paddingRight: string
  reversed: boolean
  pauseOnHover: boolean
}

export interface ThrowSliderControlOptions {
  duration: number
  ease: string
}

interface ThrowEvent {
  currentItem: HTMLElement
  currentIndex: number
}

/**
 * Throw slider -
 * @element throw-slider
 * @slot - This element has a slot
 * @autoplay - Autoplay
 * @speed - Speed
 * @center - Center
 * @noRepeat - No repeat
 * @reversed - Reversed
 * @noSnap - No snap
 * @noPauseOnHover - No pause on hover
 * @throwResistance - Throw resistance, default is 3500
 * @notDraggable - Not draggable
 * @event onChange - Fired when the active element changes
 * @cssprop --throw-slider-slide-gap - Gap between slides, default is '0'
 * @cssprop --throw-slider-slide-width - Width of slides, defalt is 'auto'
 *
 */
@customElement("throw-slider")
export class ThrowSlider extends LitElement {
  static styles = css`
    :host {
      --throw-slider-slide-width: auto;
      --throw-slider-slide-gap: 0;

      display: block;
    }

    .wrapper {
      overflow: hidden;
      max-width: 100%;
      display: flex;
      gap: var(--throw-slider-slide-gap);
    }

    ::slotted(*) {
      flex: 1 0 var(--throw-slider-slide-width);
      margin: 0;
      padding: 0;
    }
  `

  @property({ type: Boolean }) autoplay = false
  @property({ type: Number }) speed = 1
  @property({ type: Boolean }) notDraggable = false // make it draggable
  @property({ type: Boolean }) center = false // active element is the one in the center of the container rather than the left edge
  @property({ type: Boolean }) noRepeat = false
  @property({ type: Boolean }) reversed = false
  @property({ type: Boolean }) noSnap = false
  @property({ type: Boolean }) noPauseOnHover = false
  @property({ type: Number }) throwResistance = 3500

  @state() playing = this.autoplay

  @queryAssignedElements({}) carouselItems!: Array<HTMLElement>

  loop!: gsap.core.Timeline
  wrapper = createRef<HTMLElement>()

  constructor() {
    super()
  }

  connectedCallback() {
    gsap.registerPlugin(Draggable, InertiaPlugin, ScrollTrigger)
    const defer = window.requestIdleCallback || requestAnimationFrame

    defer(() => {
      const options: ThrowSliderOptions = {
        carouselWrapper: this.wrapper.value as HTMLElement,
        carouselItems: this.carouselItems,
        speed: this.speed,
        paused: !this.autoplay,
        draggable: !this.notDraggable,
        center: this.center,
        repeat: this.noRepeat ? 0 : -1,
        reversed: this.reversed,
        snap: !this.noSnap,
        paddingRight: getComputedStyle(this).getPropertyValue(
          "--throw-slider-slide-gap"
        ),
        pauseOnHover: !this.noPauseOnHover,
        throwResistance: this.throwResistance,
      }
      this.init(options)
      console.log(options)
    })
    super.connectedCallback()
  }

  disconnectedCallback() {
    this.loop && this.loop.kill()
    super.disconnectedCallback()
  }

  private async init(options: ThrowSliderOptions) {
    const items: Array<HTMLElement> = gsap.utils.toArray(options.carouselItems)
    let activeElement: HTMLElement

    if (this.hasImages() && this.isAutoWidth()) {
      const imagesLoaded = await this.imagesLoaded()
      console.info("All images loaded")
    }

    this.loop = this.createLoop(items, {
      onChange: (element: HTMLElement, index: number) => {
        // when the active element changes, this function gets called.
        activeElement && activeElement.classList.remove("active")
        element.classList.add("active")
        activeElement = element
        this.dispatchEvent(
          new CustomEvent("onChange", {
            detail: { currentItem: activeElement, currentIndex: index },
          })
        )
      },
      ...options,
    })
  }

  private hasImages(): boolean {
    return this.carouselItems.some((item: HTMLElement) =>
      item.querySelector("img")
    )
  }

  private isAutoWidth(): boolean {
    return (
      window
        .getComputedStyle(this)
        .getPropertyValue("--throw-slider-slide-width") === "auto"
    )
  }

  private async imagesLoaded(): Promise<unknown> {
    const images: Array<HTMLImageElement> = this.carouselItems.map(
      (item: HTMLElement) => item.querySelector("img") as HTMLImageElement
    )
    return await Promise.all(
      images.map((image: HTMLImageElement) => {
        return new Promise((resolve, reject) => {
          image.addEventListener("load", resolve)
          image.addEventListener("error", resolve) // resolve anyway because otherwise the carousel will seem broken
        })
      })
    )
  }

  private createLoop(
    items: Array<HTMLElement>,
    config: ThrowSliderOptions
  ): gsap.core.Timeline {
    if (!items) throw new Error("No items found")

    let onChange = config.onChange,
      lastIndex = 0,
      tl = gsap.timeline({
        repeat: config.repeat,
        onUpdate:
          onChange &&
          function () {
            let i = tl.closestIndex()
            if (lastIndex !== i) {
              lastIndex = i
              onChange && onChange(items[i], i)
            }
          },
        paused: config.paused,
        defaults: { ease: "none" },
        onReverseComplete: (): any =>
          tl.totalTime(tl.rawTime() + tl.duration() * 100),
      }),
      length = items.length,
      startX = items[0].offsetLeft,
      times: any[] = [],
      widths: number[] = [],
      spaceBefore: number[] = [],
      xPercents: any[] = [],
      curIndex = 0,
      indexIsDirty = false,
      windowWidth = window.innerWidth,
      center = config.center,
      pixelsPerSecond = (config.speed || 1) * 100,
      snap =
        config.snap === false
          ? (v: any) => v
          : gsap.utils.snap(Number(config.snap) || 1), // some browsers shift by a pixel to accommodate flex layouts, so for example if width is 20% the first element's width might be 242px, and the next 243px, alternating back and forth. So we snap to 5 percentage points to make things look more natural
      timeOffset = 0,
      // container = center === true ? items[0].parentNode : gsap.utils.toArray(center)[0] || items[0].parentNode,
      container: HTMLElement = config.carouselWrapper,
      totalWidth: number,
      getTotalWidth = () =>
        items[length - 1].offsetLeft +
        (xPercents[length - 1] / 100) * widths[length - 1] -
        startX +
        spaceBefore[0] +
        items[length - 1].offsetWidth *
          (gsap.getProperty(items[length - 1], "scaleX") as number) +
        (parseFloat(config.paddingRight) || 0),
      populateWidths = () => {
        let b1 = container.getBoundingClientRect(),
          b2
        items.forEach((el, i) => {
          widths[i] = parseFloat(gsap.getProperty(el, "width", "px") as string)
          xPercents[i] = snap(
            (parseFloat(gsap.getProperty(el, "x", "px") as string) /
              widths[i]) *
              100 +
              (gsap.getProperty(el, "xPercent") as number)
          )
          b2 = el.getBoundingClientRect()
          spaceBefore[i] = b2.left - (i ? b1.right : b1.left)
          b1 = b2
        })
        gsap.set(items, {
          // convert "x" to "xPercent" to make things responsive, and populate the widths/xPercents Arrays to make lookups faster.
          xPercent: (i) => xPercents[i],
        })
        totalWidth = getTotalWidth()
      },
      timeWrap: (arg0: number) => any,
      populateOffsets = () => {
        timeOffset = center
          ? (tl.duration() * (container.offsetWidth / 2)) / totalWidth
          : 0
        center &&
          times.forEach((_t, i) => {
            times[i] = timeWrap(
              tl.labels["label" + i] +
                (tl.duration() * widths[i]) / 2 / totalWidth -
                timeOffset
            )
          })
      },
      getClosest = (values: string | any[], value: number, wrap: number) => {
        let i = values.length,
          closest = 1e10,
          index = 0,
          d
        while (i--) {
          d = Math.abs(values[i] - value)
          if (d > wrap / 2) {
            d = wrap - d
          }
          if (d < closest) {
            closest = d
            index = i
          }
        }
        return index
      },
      populateTimeline = () => {
        let i, item, curX, distanceToStart, distanceToLoop
        tl.clear()
        for (i = 0; i < length; i++) {
          item = items[i]
          curX = (xPercents[i] / 100) * widths[i]
          distanceToStart = item.offsetLeft + curX - startX + spaceBefore[0]
          distanceToLoop =
            distanceToStart +
            widths[i] * (gsap.getProperty(item, "scaleX") as number)
          tl.to(
            item,
            {
              xPercent: snap(((curX - distanceToLoop) / widths[i]) * 100),
              duration: distanceToLoop / pixelsPerSecond,
            },
            0
          )
            .fromTo(
              item,
              {
                xPercent: snap(
                  ((curX - distanceToLoop + totalWidth) / widths[i]) * 100
                ),
              },
              {
                xPercent: xPercents[i],
                duration:
                  (curX - distanceToLoop + totalWidth - curX) / pixelsPerSecond,
                immediateRender: false,
              },
              distanceToLoop / pixelsPerSecond
            )
            .add("label" + i, distanceToStart / pixelsPerSecond)
          times[i] = distanceToStart / pixelsPerSecond
        }
        timeWrap = gsap.utils.wrap(0, tl.duration())
      },
      refresh = (deep: boolean | undefined) => {
        let progress = tl.progress()
        tl.progress(0, true)
        populateWidths()
        deep && populateTimeline()
        populateOffsets()
        deep && tl.draggable
          ? tl.time(times[curIndex], true)
          : tl.progress(progress, true)
      },
      proxy: HTMLDivElement
    gsap.set(items, { x: 0 })
    populateWidths()
    populateTimeline()
    populateOffsets()
    window.addEventListener("resize", () => {
      if (window.innerWidth !== windowWidth) {
        windowWidth = window.innerWidth
        refresh(true)
      }
    })

    if (!config.paused && tl) {
      ScrollTrigger.create({
        trigger: container,
        onRefresh: (self) => {
          if (self.progress <= 0) tl.pause()
        },
        onUpdate: (self) => {
          if (self.progress > 0 && self.progress < 1) {
            if (!this.playing) this.playTimeline()
          } else {
            tl.pause()
          }
        },
      })
    }
    console.log(config.pauseOnHover)

    if (!config.paused && config.pauseOnHover) {
      container.addEventListener("mouseenter", () => {
        this.pauseTimeline()
      })

      container.addEventListener("touchstart", () => {
        this.pauseTimeline()
      })

      container.addEventListener("mouseleave", () => {
        this.playTimeline()
      })
      container.addEventListener("touchend", () => {
        this.playTimeline()
      })
    }

    function toIndex(index: number, vars: gsap.TweenVars | undefined) {
      vars = vars || {}
      Math.abs(index - curIndex) > length / 2 &&
        (index += index > curIndex ? -length : length) // always go in the shortest direction
      let newIndex = gsap.utils.wrap(0, length, index),
        time = times[newIndex]
      if (time > tl.time() !== index > curIndex && index !== curIndex) {
        // if we're wrapping the timeline's playhead, make the proper adjustments
        time += tl.duration() * (index > curIndex ? 1 : -1)
      }
      if (time < 0 || time > tl.duration()) {
        vars.modifiers = { time: timeWrap }
      }
      curIndex = newIndex
      vars.overwrite = true
      gsap.killTweensOf(proxy)
      return vars.duration === 0
        ? tl.time(timeWrap(time))
        : tl.tweenTo(time, vars)
    }
    tl.toIndex = (index: number, vars: gsap.TweenVars | undefined) =>
      toIndex(index, vars)
    tl.closestIndex = (setCurrent: any) => {
      let index = getClosest(times, tl.time(), tl.duration())
      if (setCurrent) {
        curIndex = index
        indexIsDirty = false
      }
      return index
    }
    tl.current = () => (indexIsDirty ? tl.closestIndex(true) : curIndex)
    tl.next = (vars: gsap.TweenVars | undefined) =>
      toIndex(tl.current() + 1, vars)
    tl.previous = (vars: gsap.TweenVars | undefined) =>
      toIndex(tl.current() - 1, vars)
    tl.times = times
    tl.progress(1, true).progress(0, true) // pre-render for performance
    if (config.reversed) {
      tl.vars.onReverseComplete && tl.vars.onReverseComplete()
      tl.reverse()
    }
    if (config.draggable && typeof Draggable === "function") {
      proxy = document.createElement("div")
      let wrap = gsap.utils.wrap(0, 1),
        ratio: number,
        startProgress: number,
        draggable: globalThis.Draggable,
        lastSnap: number,
        initChangeX: number,
        align = () =>
          tl.progress(
            wrap(startProgress + (draggable.startX - draggable.x) * ratio)
          ),
        syncIndex = () => tl.closestIndex(true)
      typeof InertiaPlugin === "undefined" &&
        console.warn(
          "InertiaPlugin required for momentum-based scrolling and snapping. https://greensock.com/club"
        )
      draggable = Draggable.create(proxy, {
        trigger: items[0].parentNode as HTMLElement,
        type: "x",
        onPressInit() {
          gsap.killTweensOf(tl)
          let x = this.x
          startProgress = tl.progress()
          refresh(false)
          ratio = 1 / totalWidth
          initChangeX = startProgress / -ratio - x
          gsap.set(proxy, { x: startProgress / -ratio })
        },
        onDrag: align as any,
        onThrowUpdate: align as any,
        overshootTolerance: 0,
        inertia: true,
        snap(value) {
          //note: if the user presses and releases in the middle of a throw, due to the sudden correction of proxy.x in the onPressInit(), the velocity could be very large, throwing off the snap. So sense that condition and adjust for it. We also need to set overshootTolerance to 0 to prevent the inertia from causing it to shoot past and come back
          if (Math.abs(startProgress / -ratio - this.x) < 10) {
            return lastSnap + initChangeX
          }
          let time = -(value * ratio) * tl.duration(),
            wrappedTime = timeWrap(time),
            snapTime = times[getClosest(times, wrappedTime, tl.duration())],
            dif = snapTime - wrappedTime
          Math.abs(dif) > tl.duration() / 2 &&
            (dif += dif < 0 ? tl.duration() : -tl.duration())
          lastSnap = (time + dif) / tl.duration() / -ratio
          return lastSnap
        },
        onRelease() {
          syncIndex()
          draggable.isThrowing && (indexIsDirty = true)
        },
        onThrowComplete: syncIndex,
        throwResistance: config.throwResistance,
      })[0]
      tl.draggable = draggable
    }
    tl.closestIndex(true)
    lastIndex = curIndex
    onChange && onChange(items[curIndex], curIndex)
    return tl
  }

  /**
   * Play/pause the autoplay
   *
   * @param   {boolean}  force  force a state
   *
   */
  public toggleAutoplay(force?: boolean) {
    if (force === undefined)
      !this.playing ? this.playTimeline() : this.pauseTimeline()
    else force ? this.playTimeline() : this.pauseTimeline()
  }

  /**
   * Go to next slide
   *
   * @param   {ThrowSliderControlOptions}  options  duration in seconds, ease as string fx. "power1.inOut"
   *
   */
  public next(options: ThrowSliderControlOptions) {
    this.loop.next(
      Object.assign({}, { duration: 0.4, ease: "power1.inOut" }, options)
    )
  }

  /**
   * Go to previous slide
   *
   * @param   {ThrowSliderControlOptions}  options  duration in seconds, ease as string fx. "power1.inOut"
   *
   */
  public previous(options: ThrowSliderControlOptions) {
    this.loop.previous(
      Object.assign({}, { duration: 0.4, ease: "power1.inOut" }, options)
    )
  }

  /**
   * Go to slide by index (0 based)
   *
   * @param   {index}                        index    Index of slide
   * @param   {ThrowSliderControlOptions}  options  duration in seconds, ease as string fx. "power1.inOut"
   *
   */
  public goTo(index: number, options: ThrowSliderControlOptions) {
    this.loop.toIndex(
      index,
      Object.assign({}, { duration: 0.4, ease: "power1.inOut" }, options)
    )
  }

  private playTimeline() {
    this.reversed ? this.loop.reverse() : this.loop.play()
    this.playing = true
  }

  private pauseTimeline() {
    this.loop.pause()
    this.playing = false
  }

  protected render() {
    return html`
      <section ${ref(this.wrapper)} class="wrapper">
        <slot></slot>
      </section>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "throw-slider": ThrowSlider
  }
}
