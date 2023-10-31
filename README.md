# throw-slider

Slider with throw effect

All credit goes to GSAP https://codepen.io/GreenSock/pen/ExdyYed

---

## Usage

### Install

```
npm i throw-slider
```

### Import

```
import 'throw-slider'
```

### Use

```
<throw-slider>
    <div>
        <img src="https://picsum.photos/800/600?random=1" alt="slide 1">
    </div>
    <div>
        <img src="https://picsum.photos/300/400?random=2" alt="slide 2">
    </div>
    <div>
        <img src="https://picsum.photos/800/300?random=3" alt="slide 3">
    </div>
    <div>
        <img src="https://picsum.photos/800/600?random=4" alt="slide 4">
    </div>
    <div>
        <img src="https://picsum.photos/600/600?random=5" alt="slide 5">
    </div>
    <div>
        <img src="https://picsum.photos/800/600?random=6" alt="slide 6">
    </div>
    <div>
        <img src="https://picsum.photos/800/600?random=7" alt="slide 7">
    </div>
    <div>
        <img src="https://picsum.photos/800/600?random=8" alt="slide 8">
    </div>
    <div>
        <img src="https://picsum.photos/800/600?random=9" alt="slide 9">
    </div>
</throw-slider>
```

### Options

| Attribute         | Type    | Default | Description                                                                        |
| ----------------- | ------- | ------- | ---------------------------------------------------------------------------------- |
| `autoplay`        | Boolean | false   | Automatically moves                                                                |
| `speed`           | Number  | 1       | Speed of the autoplay. Higher is faster                                            |
| `notDraggable`    | Boolean | false   | Remove the dragging option                                                         |
| `center`          | Boolean | false   | Active element is the one in the center of the container rather than the left edge |
| `noRepeat`        | Boolean | false   | Stop looping                                                                       |
| `reversed`        | Boolean | false   | Moves in reverse                                                                   |
| `noSnap`          | Boolean | false   | Don't snap on items                                                                |
| `noPauseOnHover`  | Boolean | false   | Don't pause autoplay on hover                                                      |
| `throwResistance` | Number  | 3500    | Throw resistance, default is 3500                                                  |

### Events

```
interface ThrowEvent {
  currentItem: HTMLElement;
  currentIndex: number;
}

"onChange": (event: CustomEvent<ThrowEvent>) => void;
```
