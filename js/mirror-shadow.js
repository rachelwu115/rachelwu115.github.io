/**
 * MIRROR SHADOW MODULE - SAFETY MODE
 * Minimal implementation to test Canvas connectivity.
 */

const CONFIG = {
    DOM: "shadowCanvas"
};

export class MirrorShadow {
    constructor() {
        this.canvas = document.getElementById(CONFIG.DOM);
        this.ctx = this.canvas.getContext('2d');
        this.init();
    }

    init() {
        console.log("SAFETY MODE: Initialized");
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.loop();
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
    }

    draw() {
        // 1. Clear with Blue to prove it's clearing
        this.ctx.fillStyle = "#000033";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 2. Draw Giant Red Box in middle
        this.ctx.fillStyle = "red";
        this.ctx.fillRect(100, 100, this.canvas.width - 200, this.canvas.height - 200);

        // 3. Draw Text
        this.ctx.font = "40px Arial";
        this.ctx.fillStyle = "white";
        this.ctx.fillText("SAFETY MODE ACTIVE", 50, 50);
        this.ctx.fillText(`Size: ${this.canvas.width}x${this.canvas.height}`, 50, 100);
    }

    loop() {
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}

export function initMirrorShadow() {
    new MirrorShadow();
}
