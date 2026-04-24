// ============================================================
// FenceRenderer.js — Pure Three.js fence renderer (zero React)
// Mirrors GateRenderer.js patterns but with fence-specific
// panel repetition, gate section integration, and spatial math.
//
// Usage:
//   var renderer = new FenceRenderer(containerElement);
//   renderer.buildFence(config);
//   renderer.updateMaterials(config);  // fast color-only update
//   renderer.setView('fr' | 'ba');     // switch camera
//   renderer.resize(width, height);
//   renderer.dispose();
// ============================================================

import {
    PO_ARR, PC_PO,
    PO_ARR_BACK, PC_PO_BACK,
    GATE_Z, GATE_ROT,
    GATE_Z_BACK, GATE_ROT_BACK,
    HEIGHT_TY, CLIP_NORMAL,
    CAMERA_FRONT, CAMERA_BACK, CAMERA_FOV, CAMERA_ZOOM,
    BOTTOM_RAIL_Y_DEFAULT, BOTTOM_RAIL_Y_BACK,
    FINIAL_Y, FINIAL_Y_VANGUARD,
    ACCENT_Y, SCROLL_Y, SCROLL_GATE_Z_OFFSET,
    PUPPY_FINIAL_GROUP_Y,
    FENCE_PUPPY_FINIAL_POSITIONS, FENCE_PUPPY_FINIAL_OFFSET_Y,
} from './fenceSpatialConstants';

import { getFenceModelPath, FENCE_TOOL_STYLES as FENCE_STYLES } from './configData';

function FenceRenderer(container) {
    var THREE = window.THREE;
    if (!THREE) throw new Error('THREE.js not found on window');

    this._container = container;
    this._animId = null;
    this._lastConfig = null;
    this._view = 'fr';

    // Scene
    this.scene = new THREE.Scene();

    // Camera — default to front yard
    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 1, 100);
    this.camera.zoom = CAMERA_ZOOM;
    this.camera.rotation.order = 'YXZ';
    this._applyCamera(CAMERA_FRONT);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.style.display = 'block';
    this.renderer.localClippingEnabled = true;
    container.appendChild(this.renderer.domElement);

    // Lighting — single ambient (matches Ultra fence tool exactly)
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Clipping planes — NON-NORMALIZED normals of ±0.9144
    // This is intentional: Three.js r86 does NOT auto-normalize.
    // Effective clip Y = constant / |normal| = 0.9144 / 0.9144 = 1.0
    this.clips = {
        postTop:   new THREE.Plane(new THREE.Vector3(0,  CLIP_NORMAL, 0), -CLIP_NORMAL),
        postBot:   new THREE.Plane(new THREE.Vector3(0, -CLIP_NORMAL, 0),  CLIP_NORMAL),
        picketTop: new THREE.Plane(new THREE.Vector3(0,  CLIP_NORMAL, 0), -CLIP_NORMAL),
        picketBot: new THREE.Plane(new THREE.Vector3(0, -CLIP_NORMAL, 0),  CLIP_NORMAL),
    };

    // Root group for all fence geometry
    this.fence = new THREE.Object3D();
    this.scene.add(this.fence);

    // Groups (created during buildFence, held for mvY repositioning)
    this._groups = {};

    // Environment map — PMREM-processed HDR
    this._envMap = null;
    this._bumpMap = null;
    var self = this;

    // Env map loading state
    this._envMapReady = false;
    this._pendingBuild = null;

    // Load front yard HDR by default
    this._loadEnvMap('fr');

    // Load bump map (shared with gate tool)
    var texLoader = new THREE.TextureLoader();
    texLoader.load('fence_tool/t/bm.jpg', function(texture) {
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        self._bumpMap = texture;
        if (self._lastConfig) self.updateMaterials(self._lastConfig);
    });

    // Allow the app shell to force a render before capturing a snapshot.
    // buildSavedDesign in app.js dispatches gv:request-render immediately
    // before toDataURL so the back buffer reflects the current scene state.
    this._onRequestRender = function() {
        try {
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        } catch (e) { /* non-fatal */ }
    }.bind(this);
    window.addEventListener('gv:request-render', this._onRequestRender);

    // Start render loop
    (function animate() {
        self._animId = requestAnimationFrame(animate);
        self.renderer.render(self.scene, self.camera);
    })();

    // Debug controls removed — positions finalized 2026-03-31
    // Front yard: (-0.60, 0, -0.20), Back yard: (0.40, 0, 0.20)
}

// ============================================================
// Camera helpers
// ============================================================
FenceRenderer.prototype._applyCamera = function(cam) {
    this.camera.position.set(cam.x, cam.y, cam.z);
    this.camera.rotation.set(0, (cam.ry * Math.PI) / 180, 0);
    this.camera.updateProjectionMatrix();
};

FenceRenderer.prototype.setView = function(view) {
    this._view = view;
    this._applyCamera(view === 'ba' ? CAMERA_BACK : CAMERA_FRONT);
    // Reload env map for the new view
    this._loadEnvMap(view);
    // NOTE: do NOT call buildFence here — let UnifiedCanvas handle that
    // via its config effect. Calling buildFence here causes infinite loop.
};

// ============================================================
// Environment map loading
// ============================================================
FenceRenderer.prototype._loadEnvMap = function(view) {
    var THREE = window.THREE;
    var self = this;
    self._envMapReady = false;
    var dir = view === 'ba' ? 'fence_tool/t/hdr_ba/' : 'fence_tool/t/hdr_fr/';
    var hdrPaths = [
        dir + 'px.hdr', dir + 'nx.hdr',
        dir + 'py.hdr', dir + 'ny.hdr',
        dir + 'pz.hdr', dir + 'nz.hdr'
    ];

    if (THREE.HDRCubeTextureLoader) {
        new THREE.HDRCubeTextureLoader()
            .load(THREE.UnsignedByteType, hdrPaths, function(hdrCubeMap) {
                var pmremGenerator = new THREE.PMREMGenerator(hdrCubeMap);
                pmremGenerator.update(self.renderer);
                var pmremCubeUVPacker = new THREE.PMREMCubeUVPacker(pmremGenerator.cubeLods, pmremGenerator.numLods);
                pmremCubeUVPacker.update(self.renderer);
                self._envMap = pmremCubeUVPacker.CubeUVRenderTarget.texture;
                self._envMapReady = true;
                if (pmremGenerator.dispose) pmremGenerator.dispose();
                if (pmremCubeUVPacker.dispose) pmremCubeUVPacker.dispose();
                // Execute any pending build that was queued while HDR was loading
                if (self._pendingBuild) {
                    var pendingConfig = self._pendingBuild;
                    self._pendingBuild = null;
                    self.buildFence(pendingConfig);
                } else if (self._lastConfig) {
                    self.updateMaterials(self._lastConfig);
                }
            });
    }
};

// ============================================================
// Resize
// ============================================================
FenceRenderer.prototype.resize = function(w, h) {
    this.camera.aspect = w / h;
    this.camera.zoom = CAMERA_ZOOM;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
};

// ============================================================
// Dispose
// ============================================================
FenceRenderer.prototype.dispose = function() {
    if (this._animId) cancelAnimationFrame(this._animId);
    if (this._onRequestRender) {
        window.removeEventListener('gv:request-render', this._onRequestRender);
        this._onRequestRender = null;
    }
    if (this._envMap) this._envMap.dispose();
    if (this._bumpMap) this._bumpMap.dispose();
    if (this._container && this.renderer.domElement) {
        this._container.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
};

// ============================================================
// updateMaterials — fast color-only update, no geometry reload
// ============================================================
FenceRenderer.prototype.updateMaterials = function(config) {
    var THREE = window.THREE;
    var color = config.color || { threeHex: 0x020202 };
    var self = this;

    this.fence.traverse(function(child) {
        if (child.isMesh && child.material) {
            child.material.color.setHex(color.threeHex);
            if (color.metalness !== undefined) child.material.metalness = color.metalness;
            if (color.roughness !== undefined) child.material.roughness = color.roughness;
            if (self._envMap) child.material.envMap = self._envMap;
            child.material.envMapIntensity = color.envMapIntensity || 1.0;
            if (self._bumpMap) child.material.bumpMap = self._bumpMap;
            child.material.bumpScale = color.bumpScale || 0.0001;
            child.material.needsUpdate = true;
        }
    });
};

// ============================================================
// buildFence — full scene rebuild
// ============================================================
FenceRenderer.prototype.buildFence = function(config) {
    var THREE = window.THREE;
    var self = this;
    var fence = this.fence;

    // If env map is still loading, queue this build for later
    if (!this._envMapReady) {
        this._pendingBuild = config;
        return;
    }

    // Clear existing meshes and reset position
    while (fence.children.length > 0) fence.remove(fence.children[0]);
    fence.position.set(0, 0, 0);
    this._groups = {};
    if (!config) return;

    this._lastConfig = config;

    // Look up style
    var styleDef = FENCE_STYLES.find(function(s) { return s.id === config.styleId; });
    if (!styleDef) return;

    // Height
    var height = config.height || '48';
    if (styleDef.isFlush) height = '48';  // Haven forced to 48"
    var tY = HEIGHT_TY[height] !== undefined ? HEIGHT_TY[height] : HEIGHT_TY['48'];

    // Clipping: 72" disables clipping entirely
    if (height === '72') {
        this.renderer.localClippingEnabled = false;
    } else {
        this.renderer.localClippingEnabled = true;
    }

    // View
    var view = this._view || 'fr';

    // Color
    var color = config.color || { threeHex: 0x020202, metalness: 0.05, roughness: 0.02, envMapIntensity: 12, bumpScale: 0.0001 };

    // Material factories (7 materials matching Ultra's fence tool)
    var makeMat = function(clipPlane) {
        var opts = {
            color: color.threeHex,
            roughness: color.roughness !== undefined ? color.roughness : 0.02,
            metalness: color.metalness !== undefined ? color.metalness : 0.05,
            envMap: self._envMap || null,
            envMapIntensity: color.envMapIntensity || 1.0,
            bumpMap: self._bumpMap || null,
            bumpScale: color.bumpScale || 0.0001,
            side: THREE.FrontSide,
        };
        if (clipPlane) {
            opts.clippingPlanes = [clipPlane];
        }
        return new THREE.MeshStandardMaterial(opts);
    };

    var matPot = makeMat(self.clips.postTop);    // post tops
    var matPob = makeMat(self.clips.postBot);    // post bottoms
    var mat1   = makeMat();                       // rails (unclipped)
    var mat1t  = makeMat(self.clips.picketTop);  // picket tops
    var mat1b  = makeMat(self.clips.picketBot);  // picket bottoms
    var mat3   = makeMat();                       // post caps, finials
    var matAct = makeMat();                       // accents

    var loader = new THREE.JSONLoader();

    // Same layout for both views, back yard gets a position offset
    var poArr = PO_ARR;
    var pcPo = PC_PO;
    var gateZ = GATE_Z;
    var gateRotRad = (GATE_ROT * Math.PI) / 180;

    // View-specific fence offsets (tuned 2026-03-31)
    if (view === 'ba') {
        fence.position.set(0.40, 0, 0.20);
    } else {
        fence.position.set(-0.60, 0, -0.20);
    }

    // Debug logging and cube removed — geometry confirmed 2026-03-31

    // Helper: ensure geometry has face normals (flat shading only — no vertex
    // normals to avoid bright specular highlights on picket edges)
    function ensureNormals(geometry) {
        if (geometry.faces && geometry.faces.length > 0) {
            geometry.computeFaceNormals();
        }
        return geometry;
    }

    // Helper: place mesh at a poArr position with rotation
    function placeMeshes(geometry, material, positions, group) {
        ensureNormals(geometry);
        positions.forEach(function(pos) {
            var mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(pos.x, pos.y, pos.z);
            mesh.rotation.y = (pos.r * Math.PI) / 180;
            group.add(mesh);
        });
    }

    // Helper: place gate section mesh
    function placeGateMesh(geometry, material, group) {
        ensureNormals(geometry);
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 0, gateZ);
        mesh.rotation.y = gateRotRad;
        group.add(mesh);
    }

    function onLoadError(url) {
        return function(err) {
            console.error('[FenceRenderer] FAILED to load:', url, err);
        };
    }

    // ---- POSTS (top + bottom halves) ----
    // Ultra loads posts as SINGLE meshes (not iterated over poArr).
    // The post model geometry already contains all posts positioned correctly.
    var grpot = new THREE.Group();
    var grpob = new THREE.Group();
    var potPath = getFenceModelPath('postTop', config);
    var pobPath = getFenceModelPath('postBot', config);
    loader.load(potPath, function(geo) {
        ensureNormals(geo);
        var mesh = new THREE.Mesh(geo, matPot);
        grpot.add(mesh);
    }, undefined, onLoadError(potPath));
    loader.load(pobPath, function(geo) {
        ensureNormals(geo);
        var mesh = new THREE.Mesh(geo, matPob);
        grpob.add(mesh);
    }, undefined, onLoadError(pobPath));
    grpot.position.y = tY;
    grpob.position.y = 0;
    fence.add(grpot);
    fence.add(grpob);
    this._groups.grpot = grpot;
    this._groups.grpob = grpob;

    // ---- POST CAPS ----
    var grpc = new THREE.Group();
    loader.load(getFenceModelPath('postCap', config), function(geo) {
        placeMeshes(geo, mat3, pcPo, grpc);
    });
    grpc.position.y = tY;
    fence.add(grpc);
    this._groups.grpc = grpc;

    // ---- TOP RAILS ----
    var grrt = new THREE.Group();
    var rtPath = getFenceModelPath('railTop', config);
    var gsRtPath = getFenceModelPath('gsRailTop', config);
    loader.load(rtPath, function(geo) {
        placeMeshes(geo, mat1, poArr, grrt);
        loader.load(gsRtPath, function(gsGeo) {
            placeGateMesh(gsGeo, mat1, grrt);
        }, undefined, onLoadError(gsRtPath));
    }, undefined, onLoadError(rtPath));
    grrt.position.y = tY;
    fence.add(grrt);
    this._groups.grrt = grrt;

    // ---- BOTTOM RAILS ----
    var grrb = new THREE.Group();
    loader.load(getFenceModelPath('railBot', config), function(geo) {
        placeMeshes(geo, mat1, poArr, grrb);
        // Gate section bottom rail
        loader.load(getFenceModelPath('gsRailBot', config), function(gsGeo) {
            placeGateMesh(gsGeo, mat1, grrb);
        });
    });
    // Bottom rail Y: back yard or flush → -0.099, else 0
    grrb.position.y = (view === 'ba' || styleDef.isFlush) ? BOTTOM_RAIL_Y_BACK : BOTTOM_RAIL_Y_DEFAULT;
    fence.add(grrb);
    this._groups.grrb = grrb;

    // ---- PICKET BOTTOMS (clipped) ----
    var grpb = new THREE.Group();
    loader.load(getFenceModelPath('picketBot', config), function(geo) {
        placeMeshes(geo, mat1b, poArr, grpb);
        // Gate section picket bottoms
        loader.load(getFenceModelPath('gsPicketBot', config), function(gsGeo) {
            placeGateMesh(gsGeo, mat1b, grpb);
        });
    });
    grpb.position.y = 0;
    fence.add(grpb);
    this._groups.grpb = grpb;

    // ---- PICKET TOPS (clipped) ----
    var grpt = new THREE.Group();
    var ptPath = getFenceModelPath('picketTop', config);
    loader.load(ptPath, function(geo) {
        placeMeshes(geo, mat1t, poArr, grpt);
        var gsPtPath = getFenceModelPath('gsPicketTop', config);
        loader.load(gsPtPath, function(gsGeo) {
            placeGateMesh(gsGeo, mat1t, grpt);
        }, undefined, onLoadError(gsPtPath));
    }, undefined, onLoadError(ptPath));
    grpt.position.y = tY;
    fence.add(grpt);
    this._groups.grpt = grpt;

    // ---- FINIALS (if style supports them) ----
    if (styleDef.hasFinials && config.finialType) {
        var grf = new THREE.Group();
        var finY = styleDef.isVanguard ? FINIAL_Y_VANGUARD : FINIAL_Y;
        loader.load(getFenceModelPath('finial', config), function(geo) {
            poArr.forEach(function(pos) {
                var mesh = new THREE.Mesh(geo, mat3);
                mesh.position.set(pos.x, finY, pos.z);
                mesh.rotation.y = (pos.r * Math.PI) / 180;
                grf.add(mesh);
            });
            // Gate section finials
            loader.load(getFenceModelPath('gsFinial', config), function(gsGeo) {
                var mesh = new THREE.Mesh(gsGeo, mat3);
                var gsFinY = styleDef.isVanguard ? FINIAL_Y_VANGUARD : FINIAL_Y;
                mesh.position.set(0, gsFinY, gateZ);
                mesh.rotation.y = gateRotRad;
                grf.add(mesh);
            });
        });
        grf.position.y = tY;
        fence.add(grf);
        this._groups.grf = grf;
    }

    // ---- ACCENTS: CIRCLES / BUTTERFLIES ----
    var hasCir = config.accessories && config.accessories.cir;
    var hasBut = config.accessories && config.accessories.but;
    if (hasCir || hasBut) {
        var gract = new THREE.Group();
        var accentType = hasCir ? 'circle' : 'butterfly';
        var gsAccentType = hasCir ? 'gsCircle' : 'gsButterfly';
        loader.load(getFenceModelPath(accentType, config), function(geo) {
            placeMeshes(geo, matAct, poArr, gract);
            loader.load(getFenceModelPath(gsAccentType, config), function(gsGeo) {
                placeGateMesh(gsGeo, matAct, gract);
            });
        });
        // Y offset: spear styles get additional -0.1524 offset
        var accentYOff = styleDef.isSpear ? ACCENT_Y.spear_offset : ACCENT_Y.flat_default;
        gract.position.y = tY + accentYOff;
        fence.add(gract);
        this._groups.gract = gract;
    }

    // ---- ACCENTS: SCROLLS ----
    var hasScr = config.accessories && config.accessories.scr;
    if (hasScr) {
        var gracs = new THREE.Group();
        loader.load(getFenceModelPath('scroll', config), function(geo) {
            placeMeshes(geo, mat3, poArr, gracs);
            // Gate section scroll at gZ + offset
            var mesh = new THREE.Mesh(geo, mat3);
            mesh.position.set(0, 0, gateZ + SCROLL_GATE_Z_OFFSET);
            mesh.rotation.y = gateRotRad;
            gracs.add(mesh);
        });
        // Scroll Y positioning (complex formula from mvY)
        var scrollBase;
        if (styleDef.isSpear) {
            scrollBase = hasCir ? SCROLL_Y.spear_front_with_circles : SCROLL_Y.spear_front_no_circles;
        } else {
            scrollBase = hasCir ? SCROLL_Y.flat_front_with_circles : SCROLL_Y.flat_front_no_circles;
        }
        if (view === 'ba') scrollBase += SCROLL_Y.back_additional;
        gracs.position.y = (tY / 2) + scrollBase;
        fence.add(gracs);
        this._groups.gracs = gracs;
    }

    // ---- PUPPY PICKETS ----
    // Fence tool has DEDICATED puppy models in m/6/:
    //   pupst.json / gpupst.json — standard puppy panels + gate section
    //   pupcl.json / gpupcl.json — classic puppy panels + gate section
    // Models contain short pickets + puppy rail baked into geometry.
    //
    // Rail Y from model vertex analysis (NOT gate tool formula):
    //   pupcl (classic):  built-in rail center at Y=0.273
    //   pupst (standard): built-in rail center at Y=0.394
    var hasPup = config.accessories && config.accessories.pup && config.pupType;
    if (hasPup) {
        var pupType = config.pupType || 'pupst';
        var pupVariant = config._pupVariant || pupType;
        var isClassicPuppy = (pupType === 'pupcl');
        // Puppy rail Y from model geometry (used for finial positioning only —
        // the rail itself is baked into the puppy model)
        var puppyRailY = isClassicPuppy ? 0.273 : 0.394;

        // PUPPY PANELS — load fence panel puppy model at each poArr position
        // The puppy models (pupcl.json/pupst.json) contain BOTH short pickets
        // AND the puppy rail baked into the geometry. No separate rail needed.
        //   pupcl: built-in rail at Y≈0.273, pupst: built-in rail at Y≈0.394
        var grpu = new THREE.Group();
        var pupPath = getFenceModelPath('puppy', config);
        var gsPupPath = getFenceModelPath('gsPuppy', config);
        loader.load(pupPath, function(geo) {
            placeMeshes(geo, mat1, poArr, grpu);
            // Gate section puppy
            loader.load(gsPupPath, function(gsGeo) {
                placeGateMesh(gsGeo, mat1, grpu);
            }, undefined, onLoadError(gsPupPath));
        }, undefined, onLoadError(pupPath));
        grpu.position.y = 0;
        fence.add(grpu);
        this._groups.grpu = grpu;

        // PUPPY FINIALS — classic variants get finials from gate_tool/m/3/
        // (fence_tool/m/7/ doesn't have real models — 404s from Ultra's server)
        // Uses same finial models as gate tool: fp, fs, ft, fq
        // Finials placed at each picket position within each panel (16 per panel)
        if (isClassicPuppy) {
            var pupSuffix = pupVariant.replace('pupcl_', '').replace('pupcl', 'plg');
            var pfModelMap = {plg:'fp',pls:'fp',spe:'fs',sps:'fs',tri:'ft',trs:'ft',qua:'fq',qus:'fq'};
            var pfModel = pfModelMap[pupSuffix] || 'fp';
            var pfModelPath = 'gate_tool/m/3/' + pfModel + '.json';
            var isStaggered = ['pls','sps','trs','qus'].indexOf(pupSuffix) !== -1;
            var finPositions = isStaggered ? FENCE_PUPPY_FINIAL_POSITIONS.staggered : FENCE_PUPPY_FINIAL_POSITIONS.standard;

            var grpf = new THREE.Group();
            loader.load(pfModelPath, function(geo) {
                ensureNormals(geo);
                // Place finials at each picket position within each panel
                poArr.forEach(function(panelPos) {
                    var panelRotRad = (panelPos.r * Math.PI) / 180;
                    finPositions.forEach(function(fp) {
                        var mesh = new THREE.Mesh(geo, mat3);
                        // Transform finial local X into panel's rotated coordinate space
                        if (panelPos.r === 0) {
                            // Front-facing panel: finial X is along world X
                            mesh.position.set(panelPos.x + fp[0], fp[1], panelPos.z + fp[2]);
                        } else {
                            // Side-facing panel (r=-90): finial X maps to world Z
                            mesh.position.set(panelPos.x + fp[2], fp[1], panelPos.z + fp[0]);
                        }
                        mesh.rotation.y = panelRotRad;
                        grpf.add(mesh);
                    });
                });
                // Gate section finials — filter to gate model width (gpupcl X max = 1.127)
                finPositions.forEach(function(fp) {
                    if (fp[0] > 1.127) return;
                    var mesh = new THREE.Mesh(geo, mat3);
                    mesh.position.set(fp[2], fp[1], gateZ + fp[0]);
                    mesh.rotation.y = gateRotRad;
                    grpf.add(mesh);
                });
            }, undefined, onLoadError(pfModelPath));
            grpf.position.y = puppyRailY + FENCE_PUPPY_FINIAL_OFFSET_Y;
            fence.add(grpf);
            this._groups.grpf = grpf;
        }
    }
};

export default FenceRenderer;
