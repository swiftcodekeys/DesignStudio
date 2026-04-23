class GateTool {
    constructor(stlArr) {
        this.stlArr = stlArr;
        this.assetPathStr = '';
        this.isDesktop = true;
        this.frun = true;
        this.wid = 1960;
        this.hei = 1096;
        this.container;
        this.scene;
        this.camera;
        this.cm;
        this.renderer;
        this.threeCV;
        this.rndrNum = 0;
        this.iSc;
        this.gN = 1;
        this.stlI = 'f2';
        this.stlS = 'UAF-200';
        this.modI = '200';
        this.po40 = true;
        this.ht = '60';
        this.poI = 'po14';
        this.poA = '';
        this.mntI = 'p';
        this.mntS = 'Double Leaf Post Mount';
        this.lfI = '2';
        this.lfS = 'Double';
        this.arI = 'e';
        this.arS = 'Estate';
        this.rtI = 'rt2e';
        this.rtA = '';
        this.rbI = 'rb2';
        this.rbA = '';
        this.ufr = false;
        this.ufrI = 'ufr2';
        this.ufrA = '';
        this.mdr = false;
        this.res = false;
        this.xlr = false;
        this.xtr = false;
        this.pteI = 'pt2ee';
        this.pteA = '';
        this.ptoI = 'pt2eo';
        this.ptoA = '';
        this.ptxI = 'pt2ex';
        this.ptxA = '';
        this.pbeI = 'pt2e';
        this.pbeA = '';
        this.pboI = 'pt2o';
        this.pboA = '';
        this.pbxI = 'pt2x';
        this.pbxA = '';
        this.pcI = 'pcf';
        this.pcA = '';
        this.pcS = 'Flat Cap';
        this.finI = 'fs';
        this.finA = '';
        this.finS = 'Spear';
        this.finT = 's';
        this.finC = 'x';
        this.fin = false;
        this.stg = false;
        this.actT = '';
        this.actI = '';
        this.actA = '';
        this.tcr = false;
        this.tbu = false;
        this.acbT = '';
        this.acbI = '';
        this.acbA = '';
        this.bcr = false;
        this.bbu = false;
        this.scr = false;
        this.hTcr = false;
        this.hTbu = false;
        this.hScr = false;
        this.hBcr = false;
        this.hBbu = false;
        this.hPup = false;
        this.pup = false;
        this.pupI = '';
        this.pupA = '';
        this.pfin = false;
        this.pfinI = '';
        this.pfinA = '';
        this.pupS = '';
        this.cS = 'Black';
        this.cN = 2;
        this.isScr = false;
        this.mnScr;
    }

    init() {
        console.log('GateTool.init()');
        this.container = document.getElementById('usi');

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0b1220);
        
        const light = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(light);

        this.camera = new THREE.PerspectiveCamera(50, this.wid / this.hei, 0.1, 1000);
        this.camera.position.set(0, 0, 15);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            preserveDrawingBuffer: true
        });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.wid, this.hei);

        this.threeCV = this.renderer.domElement;
        this.threeCV.id = 'usicv';
        this.container.appendChild(this.threeCV);

        window.renderer = this.renderer; // Expose globally for legacy code
        window.parent.postMessage({ type: 'GATE_READY' }, '*');
        
        // FORCE LOAD TEST
        console.log("Attempting force load of post...");
        var loader = new THREE.JSONLoader();
        // Note: No leading slash, relative to index.html
        loader.load('m/0/po14.json', (geometry, materials) => {
            var material = new THREE.MeshFaceMaterial(materials);
            var mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(0, 0, 0);
            mesh.scale.set(10, 10, 10); // Scale up to be visible
            this.scene.add(mesh);
            console.log("FORCE LOAD SUCCESS: Mesh added to scene");
        }, undefined, (err) => {
            console.error("FORCE LOAD FAILED", err);
        });
    }

    start() {
        console.log('GateTool.start()');
        const animate = () => {
            requestAnimationFrame(animate);
            this.render();
        };
        animate();
    }

    render() {
        if (this.renderer) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    findStyleIndexByCode(code) {
        if (!this.stlArr) return null;
        for (var i = 0; i < this.stlArr.length; i++) {
            if (this.stlArr[i] && this.stlArr[i].code === code) return i;
        }
        return null;
    }

    gOpt(isNew) {
        console.log('GateTool.gOpt()');
        if (isNew) {
            this.gN = this.findStyleIndexByCode(this.stlS);
        }
        this.loadGateStyle();
    }

    loadGateStyle() {
        console.log('GateTool.loadGateStyle()');
        console.log('Loading style:', this.stlS);

        const loader = new THREE.ObjectLoader();
        const models = this.stlArr[this.gN];

        if (!models || !models.mod) {
            console.error('Incomplete model data for style:', this.stlS);
            return;
        }

        if (this.gateGroup) {
            this.scene.remove(this.gateGroup);
        }
        this.gateGroup = new THREE.Group();
        this.scene.add(this.gateGroup);

        const material = new THREE.MeshStandardMaterial({
            color: 0x555555,
            metalness: 0.8,
            roughness: 0.3,
        });

        // Helper to load objects and add them to the group
        const loadObj = (partName) => {
            let finalUrl = '';

            // Temporary hardcoded mapping to prove rendering works
            if (partName.includes('po14') || partName.includes('post')) {
                finalUrl = 'gate_tool/m/0/po14.json';
            } else if (partName.includes('hng') || partName.includes('hinge')) {
                finalUrl = 'gate_tool/m/3/hng.json';
            } else {
                // Fallback for testing to ensure SOMETHING loads
                finalUrl = 'gate_tool/m/3/ufr2.json';
            }

            console.log(`Redirecting load: ${partName} -> ${finalUrl}`);
            loader.load(finalUrl, 
                (obj) => { // onLoad
                    obj.traverse((child) => {
                        if (child.isMesh) {
                            child.material = material;
                        }
                    });
                    this.gateGroup.add(obj);
                },
                undefined, // onProgress callback is not needed here.
                (err) => { // onError
                    console.error(`Failed to load model: ${finalUrl}`, err);
                }
            );
        };

        // Load all the gate parts
        loadObj(`l${this.ht}.json`);
        loadObj(`r${this.ht}.json`);
        loadObj(`pl${this.poI}.json`);
        loadObj(`pr${this.poI}.json`);

        if (this.fin) {
            loadObj(`fin${this.finI}.json`);
        }

        loadObj(`pcl${this.pcI}.json`);
        loadObj(`pcr${this.pcI}.json`);

        if (this.rtA !== '') {
            loadObj(`rt${this.rtI}.json`);
        }

        if (this.scr) {
            loadObj('scr.json');
        }

        console.log('Gate assembly loading initiated.');
    }
}
