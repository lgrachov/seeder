import { BIOMES } from '../util/constants';

export class DrawSeed {
    constructor(mcVersion, queue, canvas, onclick, onmousemove, drawDim, pixDim, offsetX, offsetZ) {
        this.mcVersion = mcVersion;
        this.queue = queue;
        this.canvas = canvas;
        this.biomesDict = {};
        this.ctx = this.canvas.getContext("2d");
        this.drawDim = drawDim ?? 50;
        this.pixDim = pixDim ?? 1;
        this.offsetX = offsetX ?? Math.floor((this.canvas.width / this.drawDim) / 2);
        this.offsetZ = offsetZ ?? Math.floor((this.canvas.height / this.drawDim) / 2);
        this.spawnShown = false;
        this.spawnX = null;
        this.spawnZ = null;
        this.strongholdsShown = false;
        this.strongholds = null;
        this.structuresShown = {};
        this.structures = {};
        this.toDraw = 0;
        this.showStructureCoords = true;

        if (onclick) {
            this.canvas.onclick = (e) => {
                const [x, y, biome] = this.getBiomeAndPos(e);
                if (x && y && biome) {
                    onclick(x, y, biome);
                }
            };
        }

        if (onmousemove) {
            this.canvas.onmousemove = (e) => {
                const [x, y, biome] = this.getBiomeAndPos(e);
                if (x && y && biome) {
                    onmousemove(x, y, biome);
                }
            };
        }
    }

    setShowStructureCoords(value) {
        if (value !== this.showStructureCoords) {
            this.showStructureCoords = value;
            this.draw();
        }
    }

    setSeed(seed) {
        if (this.seed !== seed) {
            this.seed = seed;
            this.structures = {};
            if (this.spawnShown) {
                this.showSpawn();
            }
            if (this.strongholdsShown) {
                this.showStrongholds();
            }
        }
    }

    setMcVersion(mcVersion) {
        this.mcVersion = mcVersion;
    }

    showSpawn(callback) {
        this.queue.findSpawn(this.mcVersion, this.seed, (x, z) => {
            this.spawnX = x;
            this.spawnZ = z;
            const spawnShownBefore = this.spawnShown;
            this.spawnShown = true;
            if (!spawnShownBefore) this._afterDrawDone();
            if (callback) callback([this.spawnX, this.spawnZ]);
        });
    }

    showStrongholds(callback) {
        this.queue.findStrongholds(this.mcVersion, this.seed, 1 /* TODO: CHANGE ME */, ({ coords }) => {
            this.strongholds = coords;
            const strongholdsShownBefore = this.strongholdsShown;
            this.strongholdsShown = true;
            if (!strongholdsShownBefore) this._afterDrawDone();
            if (callback) callback(this.strongholds);
        });
    }

    showStructure(structType, callback) {
        this.queue.getStructuresInRegions(this.mcVersion, structType, this.seed, 50, ({ coords }) => {
            this.structures[structType] = coords;
            this.structuresShown[structType] = true;
            this._afterDrawDone();
            if (callback) callback(this.structures[structType]);
        });
    }

    setStructuresShown(structTypes) {
        this.structuresShown = {};
        for (const structType of structTypes) {
            this.structuresShown[structType] = true;
        }
    }

    draw() {
        console.time("Drawing seed");
        if (this.toDraw > 0) {
            setTimeout(() => this.draw(), 333);
        }
        else {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.biomesDict = {};
            const xSize = Math.ceil(this.canvas.width / (this.drawDim * this.pixDim));
            const ySize = Math.ceil(this.canvas.height / (this.drawDim * this.pixDim));
            this.toDraw = xSize * ySize;
            let widthX = this.drawDim;
            let widthY = this.drawDim;
            for (let i = 0; i < xSize; i++) {
                for (let j = 0; j < ySize; j++) {
                    let startX = this.drawDim * (i - (this.offsetX / this.pixDim));
                    let startY = this.drawDim * (j - (this.offsetZ / this.pixDim));
                    let drawStartX = (this.drawDim * this.pixDim) * i;
                    let drawStartY = (this.drawDim * this.pixDim) * j;
                    this.queue.draw(this.mcVersion, this.seed, startX, startY, widthX, widthY, (colors) => {
                        this._drawLoop(colors, startX, startY, drawStartX, drawStartY, widthX, widthY);
                        if (this.toDraw === 1) {
                            this._afterDrawDone();
                            console.timeEnd("Drawing seed");
                        }
                        this.toDraw--;
                    });
                }
            }
        }
    }

    zoom() {
        if (this.pixDim < 5) {
            this.pixDim++;
            this.queue.pixDim = this.pixDim;
            this.draw();
        }
    }

    dezoom() {
        if (this.pixDim > 1) {
            this.pixDim--;
            this.pixDim = this.pixDim || 1;
            this.queue.pixDim = this.pixDim;
            this.draw();
        }
    }

    down() {
        if (this.toDraw === 0) {
            this.offsetZ--;
            const xSize = Math.ceil(this.canvas.width / (this.drawDim * this.pixDim));
            this.toDraw = xSize;

            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d");
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            tempCtx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = "#000";
            this.ctx.fillRect(0, this.canvas.height - this.drawDim, this.canvas.width, this.canvas.height);
            this.ctx.translate(0, -this.drawDim);
            this.ctx.drawImage(tempCanvas, 0, 0);
            this.ctx.translate(0, this.drawDim);

            const ySize = this.canvas.height / (this.drawDim * this.pixDim);
            for (let i = 0; i < xSize; i++) {
                let startX = this.drawDim * (i - (this.offsetX / this.pixDim));
                let startY = this.drawDim * (ySize - 1 - (this.offsetZ / this.pixDim));
                let widthX = this.drawDim;
                let widthY = this.drawDim;
                let drawStartX = (this.drawDim * this.pixDim) * i;
                let drawStartY = this.canvas.height - (this.drawDim * this.pixDim);
                this.queue.draw(this.mcVersion, this.seed, startX, startY, widthX, widthY, (colors) => {
                    this._drawLoop(colors, startX, startY, drawStartX, drawStartY, widthX, widthY);
                    if (this.toDraw === 1) {
                        this._afterDrawDone();
                    }
                    this.toDraw--;
                });
            }
        }
    }

    up() {
        if (this.toDraw === 0) {
            this.offsetZ++;
            const xSize = Math.ceil(this.canvas.width / (this.drawDim * this.pixDim));
            this.toDraw = xSize;

            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d");
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            tempCtx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = "#000";
            this.ctx.fillRect(0, 0, this.canvas.width, this.drawDim);
            this.ctx.translate(0, this.drawDim);
            this.ctx.drawImage(tempCanvas, 0, 0);
            this.ctx.translate(0, -this.drawDim);

            for (let i = 0; i < xSize; i++) {
                let startX = this.drawDim * (i - (this.offsetX / this.pixDim));
                let startY = this.drawDim * (-(this.offsetZ / this.pixDim));
                let widthX = this.drawDim;
                let widthY = this.drawDim;
                let drawStartX = (this.drawDim * this.pixDim) * i;
                let drawStartY = 0;
                this.queue.draw(this.mcVersion, this.seed, startX, startY, widthX, widthY, (colors) => {
                    this._drawLoop(colors, startX, startY, drawStartX, drawStartY, widthX, widthY);
                    if (this.toDraw === 1) {
                        this._afterDrawDone();
                    }
                    this.toDraw--;
                });
            }
        }
    }

    right() {
        if (this.toDraw === 0) {
            this.offsetX--;
            const ySize = Math.ceil(this.canvas.height / (this.drawDim * this.pixDim));
            this.toDraw = ySize;

            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d");
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            tempCtx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = "#000";
            this.ctx.fillRect(this.canvas.width - this.drawDim, 0, this.canvas.width, this.canvas.height);
            this.ctx.translate(-this.drawDim, 0);
            this.ctx.drawImage(tempCanvas, 0, 0);
            this.ctx.translate(this.drawDim, 0);

            const xSize = this.canvas.width / (this.drawDim * this.pixDim);
            for (let j = 0; j < ySize; j++) {
                let startX = this.drawDim * (xSize - 1 - (this.offsetX / this.pixDim));
                let startY = this.drawDim * (j - (this.offsetZ / this.pixDim));
                let widthX = this.drawDim;
                let widthY = this.drawDim;
                let drawStartX = this.canvas.width - (this.drawDim * this.pixDim);
                let drawStartY = (this.drawDim * this.pixDim) * j;
                this.queue.draw(this.mcVersion, this.seed, startX, startY, widthX, widthY, (colors) => {
                    this._drawLoop(colors, startX, startY, drawStartX, drawStartY, widthX, widthY);
                    if (this.toDraw === 1) {
                        this._afterDrawDone();
                    }
                    this.toDraw--;
                });
            }
        }
    }

    left() {
        if (this.toDraw === 0) {
            this.offsetX++;
            const ySize = Math.ceil(this.canvas.height / (this.drawDim * this.pixDim));
            this.toDraw = ySize;

            const tempCanvas = document.createElement("canvas");
            const tempCtx = tempCanvas.getContext("2d");
            tempCanvas.width = this.canvas.width;
            tempCanvas.height = this.canvas.height;
            tempCtx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = "#000";
            this.ctx.fillRect(0, 0, this.drawDim, this.canvas.height);
            this.ctx.translate(this.drawDim, 0);
            this.ctx.drawImage(tempCanvas, 0, 0);
            this.ctx.translate(-this.drawDim, 0);

            for (let j = 0; j < ySize; j++) {
                let startX = this.drawDim * (-(this.offsetX / this.pixDim));
                let startY = this.drawDim * (j - (this.offsetZ / this.pixDim));
                let widthX = this.drawDim;
                let widthY = this.drawDim;
                let drawStartX = 0;
                let drawStartY = (this.drawDim * this.pixDim) * j;
                this.queue.draw(this.mcVersion, this.seed, startX, startY, widthX, widthY, (colors) => {
                    this._drawLoop(colors, startX, startY, drawStartX, drawStartY, widthX, widthY);
                    if (this.toDraw === 1) {
                        this._afterDrawDone();
                    }
                    this.toDraw--;
                });
            }
        }
    }

    drawText(text, x, z) {
        if (this.showStructureCoords) {
            this.ctx.font = "bold 10px Minecraft";
            this.ctx.textAlign = "center";
            this.ctx.fillStyle = "#ffffffbb";
            const textWidth = this.ctx.measureText(text).width;
            this.ctx.fillRect(x - textWidth / 2 - 1, z + 20, textWidth + 1, 12);

            this.ctx.fillStyle = "black";
            this.ctx.fillText(text, x, z + 30);
        }
    }

    _afterDrawDone() {
        if (this.spawnShown && this.spawnX != null && this.spawnZ != null) {
            let drawX = Math.floor(this.spawnX / 4) * this.pixDim + this.offsetX * this.drawDim;
            let drawZ = Math.floor(this.spawnZ / 4) * this.pixDim + this.offsetZ * this.drawDim;
            if (drawX > 0 && drawZ > 0 && drawX < this.canvas.width && drawZ < this.canvas.height) {
                const image = new Image(32, 30);
                image.src = this.spawnImage;
                if (image.complete) {
                    this.ctx.drawImage(image, drawX - 16, drawZ - 15, 32, 30);
                } else {
                    const offsetX = this.offsetX;
                    const offsetZ = this.offsetZ;
                    const pixDim = this.pixDim;
                    image.onload = () => {
                        if (this.offsetX === offsetX && offsetZ === this.offsetZ && pixDim === this.pixDim) {
                            this.ctx.drawImage(image, drawX - 16, drawZ - 15, 32, 30);
                        }
                    };
                }
                this.drawText(`(${this.spawnX}, ${this.spawnZ})`, drawX, drawZ);
            }
        }

        if (this.strongholdsShown && this.strongholds && this.strongholds.length > 0) {
            for (const stronghold of this.strongholds) {
                let drawX = Math.floor(stronghold[0] / 4) * this.pixDim + this.offsetX * this.drawDim;
                let drawZ = Math.floor(stronghold[1] / 4) * this.pixDim + this.offsetZ * this.drawDim;
                if (drawX > 0 && drawZ > 0 && drawX < this.canvas.width && drawZ < this.canvas.height) {
                    const image = new Image(30, 30);
                    image.src = this.eyeImage;
                    if (image.complete) {
                        this.ctx.drawImage(image, drawX - 15, drawZ - 15, 30, 30);
                    } else {
                        const offsetX = this.offsetX;
                        const offsetZ = this.offsetZ;
                        const pixDim = this.pixDim;
                        image.onload = () => {
                            if (this.offsetX === offsetX && offsetZ === this.offsetZ && pixDim === this.pixDim) {
                                this.ctx.drawImage(image, drawX - 15, drawZ - 15, 30, 30);
                            }
                        };
                    }
                    this.drawText(`(${stronghold[0]}, ${stronghold[1]})`, drawX, drawZ);
                }
            }
        }

        if (this.structuresShown) {
            for (let structureKey of Object.keys(this.structuresShown)) {
                if (this.structures[structureKey]) {
                    for (const structure of this.structures[structureKey]) {
                        let drawX = Math.floor(structure[0] / 4) * this.pixDim + this.offsetX * this.drawDim;
                        let drawZ = Math.floor(structure[1] / 4) * this.pixDim + this.offsetZ * this.drawDim;
                        if (drawX > 0 && drawZ > 0 && drawX < this.canvas.width && drawZ < this.canvas.height) {
                            const image = new Image(30, 30);
                            image.src = this.images[structureKey];
                            if (image.complete) {
                                this.ctx.drawImage(image, drawX - 15, drawZ - 15, 30, 30);
                            } else {
                                const offsetX = this.offsetX;
                                const offsetZ = this.offsetZ;
                                const pixDim = this.pixDim;
                                image.onload = () => {
                                    if (this.offsetX === offsetX && offsetZ === this.offsetZ && pixDim === this.pixDim) {
                                        this.ctx.drawImage(image, drawX - 15, drawZ - 15, 30, 30);
                                    }
                                };
                            }
                            this.drawText(`(${structure[0]}, ${structure[1]})`, drawX, drawZ);
                        }
                    }
                }
            }
        }
    }

    _drawLoop(colors, startX, startY, drawStartX, drawStartY, widthX, widthY) {
        startX = Math.floor(startX);
        startY = Math.floor(startY);
        const pixels = new Array(widthY * this.pixDim * widthX * this.pixDim);
        for (let jj = 0; jj < (widthY * this.pixDim); jj++) {
            const realjj = Math.floor(jj / this.pixDim);
            const base = jj * widthX * this.pixDim;
            const jmodulo = jj % this.pixDim === 0;
            for (let ii = 0; ii < (widthX * this.pixDim); ii++) {
                const realii = Math.floor(ii / this.pixDim);
                pixels[ii + base] = colors[(realii * widthX) + realjj];

                if ((ii % this.pixDim) === 0 && jmodulo)
                    if (!this.biomesDict[startX + realii]) {
                        this.biomesDict[startX + realii] = {};
                    }
                this.biomesDict[startX + realii][startY + realjj] = colors[(realii * widthX) + realjj];
            }
        }
        const arr = Uint8ClampedArray.from(pixels.flat());
        const imageData = new ImageData(arr, widthX * this.pixDim, widthY * this.pixDim);
        this.ctx.putImageData(imageData, drawStartX, drawStartY);
    }

    getBiomeAndPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const trueX = Math.floor(x / this.pixDim - this.offsetX * (this.drawDim / this.pixDim));
        const trueY = Math.floor(y / this.pixDim - this.offsetZ * (this.drawDim / this.pixDim));

        if (this.biomesDict && this.biomesDict[trueX] && this.biomesDict[trueX][trueY]) {
            const rgba = this.biomesDict[trueX][trueY];
            const key = rgba.join('-');
            const index = this.queue.COLORS.findIndex(x => x.join('-') === key);
            if (index > -1) {
                return [4 * trueX, 4 * trueY, BIOMES.find(x => x.value === index)?.label];
            }
        }
        return [null, null, null];
    };

    spawnImage = '/img/spawn.png';

    eyeImage = '/img/eye.png';

    images = {
        /*  Desert_Pyramid */   1: '/img/temple.png',
        /*  Jungle_Pyramid */   2: '/img/jungle.png',
        /*  Swamp_Hut */        3: '/img/hut.png',
        /*  Igloo */            4: '/img/igloo.png',
        /*  Village */          5: '/img/village.png',
        /*  Ocean_Ruin */       6: '/img/ocean.png',
        /*  Shipwreck */        7: '/img/wood.jpg',
        /*  Monument */         8: '/img/guardian.png',
        /*  Mansion */          9: '/img/mansion.png',
        /*  Outpost */          10: '/img/outpost.png',
        /*  Ruined_Portal */    11: '/img/portal.png',
        /*  Treasure */         12: '/img/treasure.png',
        /*  Fortress */         13: '',
        /*  Bastion */          14: '',
        /*  End_City */         15: '',
    }
}