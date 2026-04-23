// ============================================================
// GateRenderer.js — Pure Three.js gate renderer (zero React)
// Extracted from UnifiedCanvas.js (Split 5)
//
// Usage:
//   var renderer = new GateRenderer(containerElement);
//   renderer.buildGate(config);
//   renderer.updateMaterials(config);  // fast color-only update
//   renderer.resize(width, height);
//   renderer.dispose();
// ============================================================

import {
    snap,
    M_HINGE, M_HINGE_SINGLE, M_HINGE_DIRECT, M_IDENTITY, M_CAPS, M_CAPS_SINGLE, CAP_INNER_Y,
    LEAF_TRANSFORMS, M_RAIL_PUPPY,
    CENTER_GAP,
    CLIP_POST, CLIP_PO23, CLIP_PT, CLIP_PB, HEIGHT_CLIP_OFFSET, POST_CLIP_72,
    CLIP_PB_PUPPY_STD, CLIP_PB_PUPPY_CLP,
    ACCENT_CIRCLE_BOTTOM_Y, ACCENT_BUTTERFLY_BOTTOM_Y,
    ACCENT_POSITIONS, ACCENT_BASE_Y, ACCENT_CIRCLE_RAIL_BUMP,
    FINIAL_POSITIONS, FINIAL_BASE_Y,
    PUPPY_FINIAL_POSITIONS, PUPPY_FINIAL_OFFSET_Y,
    PTRES_Y_UAF201,
    HAVEN_RAIL_T1,
    RES_BOTTOM_RAIL_Y,
} from './spatialConstants';
import { getModelPath, FENCE_STYLES } from './configData';

function GateRenderer(container) {
    var THREE = window.THREE;
    if (!THREE) throw new Error('THREE.js not found on window');

    this._container = container;
    this._animId = null;
    this._lastConfig = null;
    this._needsRender = true;
    this._onLoading = null;
    this._onReady = null;
    this._matCache = {};
    this._geoCache = {};

    // Scene
    this.scene = new THREE.Scene();
    window._gateScene = this.scene;  // expose for regression testing

    // Camera — exact legacy values
    this.camera = new THREE.PerspectiveCamera(40, 1, 1, 100);
    this.camera.zoom = 1.788;
    this.camera.position.set(0.82, 1.27, 7.2);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.set(0, (6 * Math.PI) / 180, 0);
    this.camera.updateProjectionMatrix();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.style.display = 'block';
    this.renderer.localClippingEnabled = true;
    container.appendChild(this.renderer.domElement);

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // Clipping planes
    // CRITICAL: Post clips use normalized normals (0, -1, 0) — Ultra does the same.
    // Picket clips use NON-normalized normals (0, ±0.735, 0) — matching Ultra exactly.
    // Three.js does NOT auto-normalize plane normals, so the effective clip position
    // is constant/|normal|. With |normal|=0.735 and constant=0.735, clip is at y=1.0.
    // Using normalized (0,-1,0) with same constant would clip at y=0.735 — WRONG.
    this.clips = {
        post:   new THREE.Plane(new THREE.Vector3(0, -1, 0), CLIP_POST),
        post23: new THREE.Plane(new THREE.Vector3(0, -1, 0), CLIP_PO23.e),
        pt:     new THREE.Plane(new THREE.Vector3(0,  0.735, 0), CLIP_PT),
        pb:     new THREE.Plane(new THREE.Vector3(0, -0.735, 0), CLIP_PB),
        pbRes:  new THREE.Plane(new THREE.Vector3(0, -0.735, 0), CLIP_PB),  // separate for puppy
    };

    // Gate group
    this.gate = new THREE.Object3D();
    this.scene.add(this.gate);
    this._stagingGate = null;
    this._buildGeneration = 0;

    // Environment map — PMREM-processed HDR (matches Ultra exactly)
    this._envMap = null;
    this._bumpMap = null;
    var self = this;

    // Load HDR cube map
    // NOTE: r86 HDRCubeTextureLoader has NO .setPath() method — must use full paths.
    // Also, loadHDRData has a `this.manager` binding quirk (uses undefined, falls back
    // to DefaultLoadingManager) — this is expected and not a bug.
    var hdrPaths = [
        'gate_tool/t/hdr/px.hdr', 'gate_tool/t/hdr/nx.hdr',
        'gate_tool/t/hdr/py.hdr', 'gate_tool/t/hdr/ny.hdr',
        'gate_tool/t/hdr/pz.hdr', 'gate_tool/t/hdr/nz.hdr'
    ];
    if (THREE.HDRCubeTextureLoader) {
        new THREE.HDRCubeTextureLoader()
            .load(THREE.UnsignedByteType, hdrPaths, function(hdrCubeMap) {
                var pmremGenerator = new THREE.PMREMGenerator(hdrCubeMap);
                pmremGenerator.update(self.renderer);

                var pmremCubeUVPacker = new THREE.PMREMCubeUVPacker(pmremGenerator.cubeLods, pmremGenerator.numLods);
                pmremCubeUVPacker.update(self.renderer);

                self._envMap = pmremCubeUVPacker.CubeUVRenderTarget.texture;

                // Retroactively apply to existing materials
                if (self._lastConfig) {
                    self.updateMaterials(self._lastConfig);
                }

                // Clean up (r86: dispose may not exist on all objects)
                if (pmremGenerator.dispose) pmremGenerator.dispose();
                if (pmremCubeUVPacker.dispose) pmremCubeUVPacker.dispose();
            }, undefined, function(err) {
                // HDR failed — fall back to PNG cube map
                console.warn('HDR env map failed, falling back to PNG:', err);
                var loader = new THREE.CubeTextureLoader();
                loader.setPath('gate_tool/t/hdr/');
                loader.load(['px.png','nx.png','py.png','ny.png','pz.png','nz.png'], function(cubeMap) {
                    self._envMap = cubeMap;
                    if (self._lastConfig) {
                        self.updateMaterials(self._lastConfig);
                    }
                });
            });
    }

    // Load bump map (Ultra uses bm.jpg at 2048x2048, ClampToEdgeWrapping)
    var texLoader = new THREE.TextureLoader();
    texLoader.load('gate_tool/t/bm.jpg', function(texture) {
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        self._bumpMap = texture;

        // Retroactively apply to existing materials
        if (self._lastConfig) {
            self.updateMaterials(self._lastConfig);
        }
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
        if (self._needsRender) {
            self._needsRender = false;
            self.renderer.render(self.scene, self.camera);
        }
    })();
}

GateRenderer.prototype.resize = function(w, h) {
    this.camera.aspect = w / h;
    this.camera.zoom = 1.788;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this._needsRender = true;
};

GateRenderer.prototype.dispose = function() {
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
    var self = this;
    Object.keys(this._matCache).forEach(function(k) {
        self._matCache[k].dispose();
    });
    this._matCache = {};
    Object.keys(this._geoCache).forEach(function(k) {
        self._geoCache[k].dispose();
    });
    this._geoCache = {};
    this.renderer.dispose();
};

GateRenderer.prototype._loadGeo = function(path, callback) {
    var self = this;
    var THREE = window.THREE;
    if (self._geoCache[path]) {
        var cached = self._geoCache[path];
        setTimeout(function() {
            callback(cached.clone());
        }, 0);
        return;
    }
    var loader = new THREE.JSONLoader();
    loader.load(path, function(geo) {
        self._geoCache[path] = geo;
        callback(geo.clone());
    });
};

GateRenderer.prototype._swapStagingToLive = function(stagingGate) {
    this._stagingGate = null;

    // Dispose and remove old children from live gate
    var self = this;
    var oldChildren = this.gate.children.slice();
    oldChildren.forEach(function(child) {
        self.gate.remove(child);
        if (child.geometry) child.geometry.dispose();
    });

    // Move new children from staging into live gate
    var newChildren = stagingGate.children.slice();
    newChildren.forEach(function(child) {
        stagingGate.remove(child);
        self.gate.add(child);
    });

    this._needsRender = true;
    if (this._onReady) this._onReady();
};

// ============================================================
// updateMaterials — fast color-only update, no geometry reload
// ============================================================
GateRenderer.prototype.updateMaterials = function(config) {
    this._needsRender = true;
    // Dispose cached materials before clearing to prevent GPU resource leak
    var cachedKeys = Object.keys(this._matCache);
    for (var i = 0; i < cachedKeys.length; i++) {
        this._matCache[cachedKeys[i]].dispose();
    }
    this._matCache = {};
    var THREE = window.THREE;
    var color = config.color || { threeHex: 0x080808, metalness: 0.9, roughness: 0.1 };
    var gate = this.gate;
    var self = this;

    gate.traverse(function(child) {
        if (child.isMesh && child.material) {
            child.material.color.setHex(color.threeHex);
            if (color.metalness !== undefined) child.material.metalness = color.metalness;
            if (color.roughness !== undefined) child.material.roughness = color.roughness;
            // Env map (may have loaded after initial buildGate)
            if (self._envMap) child.material.envMap = self._envMap;
            child.material.envMapIntensity = color.envMapIntensity || 1.0;
            // Bump map (may have loaded after initial buildGate)
            if (self._bumpMap) child.material.bumpMap = self._bumpMap;
            child.material.bumpScale = color.bumpScale || 0.0001;
            child.material.needsUpdate = true;
        }
    });
};

// ============================================================
// buildGate — full scene rebuild
// ============================================================
GateRenderer.prototype.buildGate = function(config) {
    this._needsRender = true;
    if (this._onLoading) this._onLoading();
    var THREE = window.THREE;
    var self = this;
    var clips = this.clips;

    // Dispose any abandoned staging gate from a superseded in-flight build
    if (this._stagingGate) {
        var abandoned = this._stagingGate;
        abandoned.children.slice().forEach(function(child) {
            if (child.geometry) child.geometry.dispose();
        });
        this._stagingGate = null;
    }

    // Generation counter — only the most recent build completes the swap
    this._buildGeneration++;
    var buildId = this._buildGeneration;
    var stagingGate = new THREE.Object3D();
    this._stagingGate = stagingGate;
    var pendingLoads = 0;

    function addMesh(mesh) {
        stagingGate.add(mesh);      // local var, not self._stagingGate
        self._needsRender = true;
    }

    function loadInto(path, fn) {
        pendingLoads++;
        self._loadGeo(path, function(geo) {
            fn(geo);
            pendingLoads--;
            if (pendingLoads === 0) {
                if (buildId === self._buildGeneration) {
                    self._swapStagingToLive(stagingGate);
                } else {
                    // Stale build — dispose accumulated staging geometry
                    stagingGate.children.slice().forEach(function(child) {
                        if (child.geometry) child.geometry.dispose();
                    });
                }
            }
        });
    }

    if (!config) {
        if (buildId === this._buildGeneration) {
            this._swapStagingToLive(stagingGate);
        } else {
            this._stagingGate = null;
        }
        return;
    }

    this._lastConfig = config;
    var archId = config.arch || 'e';
    var leaf = config.leaf || '2';
    var isDoubleLeaf = (leaf === '2');

    // Direct mount: bump camera zoom to fill the gap left by hidden outer posts
    this.camera.zoom = (config.mount === 'd') ? 1.85 : 1.788;
    this.camera.updateProjectionMatrix();

    // Spatial transforms: ALWAYS use the flat family ('2') baseline transforms.
    // Ultra's Y positions depend on style family (fsv), NOT leaf count (single/double).
    // LEAF_TRANSFORMS['1'] has fsv baked in and must NOT be used — fsv is applied
    // separately via offsetY() for spear styles.
    // config.leaf ('1'=single, '2'=double) only affects MODEL file paths (geometry),
    // not the Y positions of rails, pickets, or caps.
    var lt = LEAF_TRANSFORMS['2'];

    // Look up style metadata for finial/stagger decisions
    var styleDef = FENCE_STYLES.find(function(s) { return s.id === config.styleId; });
    var hasFinials = styleDef ? styleDef.hasFinials : false;

    // fsv: vertical offset for spear family (stlI='s1'). LEAF_TRANSFORMS were extracted
    // from flat family (fsv=0). Ultra applies fsv=-0.152 to ALL rail and picket Y positions
    // for spear styles. We apply it here so the base transforms stay untouched.
    var fsv = (styleDef && styleDef.category === 'spear') ? -0.152 : 0;

    // hOff: height offset. Ultra repositions the TOP of the gate (rails, caps, picket tops,
    // top hinges) by ±0.305m per height step while anchoring the bottom. The mid rail gets
    // half the offset. Bottom rails, bottom hinges, picket bottoms stay fixed.
    // Validated via Playwright scene extraction: 48" vs 60" vs 72" element positions.
    var hOff = HEIGHT_CLIP_OFFSET[config.height] || 0;

    // offsetY: apply both fsv and hOff to a Matrix4 Y position (index 13)
    function offsetY(m, fsvVal, heightVal) {
        var total = (fsvVal || 0) + (heightVal || 0);
        if (total === 0) return m;
        var out = m.slice();
        out[13] = out[13] + total;
        return out;
    }

    // ---- Puppy picket config (needed before rail calculations) ----
    // Ultra puppy types and their rail Y / clip values:
    //   pupst (std):  r3y = bY + _12 = 0.4598,  clip = r3y + 0.2 = 0.6598
    //   pupfl (fls):  r3y = bY + _16 = 0.4572 (bY=_2=0.0508), clip = r3y + 0.2 = 0.6572
    //   pupcl (plg/spe/tri/qua + staggered): r3y = bY + _7_5 = 0.3455, clip = _18+0.02 = 0.477
    var hasPuppy = config.accessories && config.accessories.pup;
    var pupId = hasPuppy ? config.accessories.pup : null;
    var isClassicPuppy = pupId && ['plg','pls','spe','sps','tri','trs','qua','qus'].indexOf(pupId) !== -1;
    var isFlushPuppy = (pupId === 'fls');
    // Puppy rail Y position per type
    var puppyRailY = isClassicPuppy ? 0.3455 : (isFlushPuppy ? 0.4572 : 0.4598);

    // Top rails: full fsv + full height offset
    var railT0    = offsetY(lt.railT0, fsv, hOff);
    var railT1    = offsetY(lt.railT1, fsv, hOff);
    // Mid rail: half fsv + half height offset (anchored between top and bottom)
    var railB0    = offsetY(lt.railB0, fsv / 2, hOff / 2);
    // Bottom rails: no fsv, no height offset (anchored at ground)
    var railB1    = lt.railB1;
    var railB2Raw = lt.railB2;
    var hasRes = config.accessories && config.accessories.res;
    // Ultra: if(res==true || pupI=='pupfl'){ bY = _2; } — flush puppy also lowers bottom rail
    var railB2    = (hasRes || isFlushPuppy) ? RES_BOTTOM_RAIL_Y : railB2Raw;
    // Picket tops: full fsv + full height offset
    var picketTop = offsetY(lt.picketTop, fsv, hOff);
    var ptOddStagger = (lt.picketTopOddStagger) ? offsetY(lt.picketTopOddStagger, fsv, hOff) : null;

    // Dynamic height clipping (validated against Ultra live tool)
    clips.post.constant = CLIP_POST + hOff;
    if (config.height === '72' &&
        (archId === 'e' || archId === 'a')) {
        clips.post23.constant = POST_CLIP_72;
    } else {
        clips.post23.constant =
            (CLIP_PO23[archId] || CLIP_PO23.e) + hOff;
    }

    // Puppy clip plane: controls how tall the bottom extra pickets appear
    // Ultra: cpY(pbxCp, r3y + 0.2) for std/flush, cpY(pbxCp, _18+0.02) for classic
    if (hasPuppy) {
        if (isClassicPuppy) {
            clips.pbRes.constant = CLIP_PB_PUPPY_CLP;  // 0.477
        } else if (isFlushPuppy) {
            clips.pbRes.constant = 0.6572;  // flush: r3y(0.4572) + 0.2
        } else {
            clips.pbRes.constant = CLIP_PB_PUPPY_STD;  // 0.6598
        }
    } else {
        clips.pbRes.constant = CLIP_PB;
    }

    var color = config.color || { threeHex: 0x080808 };

    var makeMat = function() {
        var cacheKey = 'base_' + (color.id || color.threeHex);
        if (self._matCache[cacheKey]) return self._matCache[cacheKey];
        var mat = new THREE.MeshStandardMaterial({
            color: color.threeHex,
            roughness: color.roughness !== undefined ? color.roughness : 0.1,
            metalness: color.metalness !== undefined ? color.metalness : 0.9,
            envMap: self._envMap || null,
            envMapIntensity: color.envMapIntensity || 1.0,
            bumpMap: self._bumpMap || null,
            bumpScale: color.bumpScale || 0.0001,
            shading: THREE.FlatShading,
            side: THREE.FrontSide,
        });
        self._matCache[cacheKey] = mat;
        return mat;
    };

    // planeKey must be a unique string per clip plane — it is part of the cache key
    var makeClipMat = function(plane, planeKey) {
        var cacheKey = 'clip_' + planeKey + '_' + (color.id || color.threeHex);
        if (self._matCache[cacheKey]) return self._matCache[cacheKey];
        var mat = new THREE.MeshStandardMaterial({
            color: color.threeHex,
            roughness: color.roughness !== undefined ? color.roughness : 0.1,
            metalness: color.metalness !== undefined ? color.metalness : 0.9,
            envMap: self._envMap || null,
            envMapIntensity: color.envMapIntensity || 1.0,
            bumpMap: self._bumpMap || null,
            bumpScale: color.bumpScale || 0.0001,
            shading: THREE.FlatShading,
            side: THREE.FrontSide,
            clippingPlanes: [plane],
        });
        self._matCache[cacheKey] = mat;
        return mat;
    };

    // Mount type: 'p' = post mount (default), 'd' = direct mount
    // Ultra direct mount: hides outer posts (po40d/po40s) + outer caps (pc0/pc1)
    // Keeps visible: hinges, inner posts (po14/po12), center stiles (po23), inner caps
    var isPostMount = (config.mount !== 'd');

    // HINGES — always visible (both mount types)
    // Direct mount: hinges push out to ±1.829 (outer post X) to fill the gap.
    // Post mount: double xD=±1.778, single xS=±1.823 (from Ultra's hngs/movX).
    // Height offset: top hinges (indices 0, 1) move with height; bottom hinges (2, 3) stay fixed.
    // Single gate (lfI=1): hng0 and hng2 (left side, indices 0,2) are hidden.
    var hingeTransforms = !isPostMount ? M_HINGE_DIRECT
        : (isDoubleLeaf ? M_HINGE : M_HINGE_SINGLE);
    loadInto(getModelPath('hinge', config), function(geo) {
        hingeTransforms.forEach(function(m, idx) {
            // Single gate: skip left hinges (indices 0, 2)
            if (!isDoubleLeaf && (idx === 0 || idx === 2)) return;
            var mesh = new THREE.Mesh(geo, makeMat());
            var hingeM = (idx <= 1) ? offsetY(m, 0, hOff) : m;
            snap(mesh, hingeM);
            addMesh(mesh);
        });
    });

    // OUTER POSTS — only for post mount (hidden for direct mount)
    // Ultra: if(mntI=='d'){ pob40s.visible=false; pob40d.visible=false; }
    if (isPostMount) {
        var outerPostModel = isDoubleLeaf ? 'po40d' : 'po40s';
        loadInto(getModelPath(outerPostModel, config), function(geo) {
            var mesh = new THREE.Mesh(geo, makeClipMat(clips.post, 'post'));
            snap(mesh, M_IDENTITY);
            addMesh(mesh);
        });
    }

    // INNER POSTS — always visible (both mount types)
    // Ultra: pob14.visible=true (double) or pob12.visible=true (single) regardless of mntI
    if (isDoubleLeaf) {
        loadInto(getModelPath('po14', config), function(geo) {
            var mesh = new THREE.Mesh(geo, makeClipMat(clips.post, 'post'));
            snap(mesh, M_IDENTITY);
            addMesh(mesh);
        });
    } else {
        loadInto(getModelPath('po12', config), function(geo) {
            var mesh = new THREE.Mesh(geo, makeClipMat(clips.post, 'post'));
            snap(mesh, M_IDENTITY);
            addMesh(mesh);
        });
    }

    // PO23 inner stiles — only for double gate (both mount types)
    // Single gate has no center seam posts (Ultra viz(): pob23.visible = false when lfI=1)
    if (isDoubleLeaf) {
        loadInto(getModelPath('po23', config), function(geo) {
            var mesh = new THREE.Mesh(geo, makeClipMat(clips.post23, 'post23'));
            snap(mesh, M_IDENTITY);
            addMesh(mesh);
        });
    }

    // POST CAPS
    // Ultra: direct mount hides pc0/pc1 (outer caps, our indices 0-1).
    // Inner caps (indices 2+) stay visible for both mount types.
    if (config.postCap) {
        var capTransforms = isDoubleLeaf ? M_CAPS : M_CAPS_SINGLE;
        loadInto(getModelPath('postCap', config), function(geo) {
            capTransforms.forEach(function(m, idx) {
                // Direct mount: skip outer caps (indices 0, 1)
                if (!isPostMount && idx <= 1) return;
                var mesh = new THREE.Mesh(geo, makeMat());
                // Double gate: inner caps (indices 4,5) use arch-aware Y
                if (isDoubleLeaf && idx >= 4) {
                    var adjusted = m.slice();
                    adjusted[13] = (CAP_INNER_Y[archId] || CAP_INNER_Y.s) + hOff;
                    snap(mesh, adjusted);
                } else {
                    snap(mesh, offsetY(m, 0, hOff));
                }
                addMesh(mesh);
            });
        });
    }

    // TOP RAILS — per-leaf Y positions
    // Haven (UAB-200, gN==4): r1 rail sits at -0.07 offset (compressed top gap)
    // vs standard -0.1905 offset. SPATIAL_TRUTH.json → rails → r1_second_rail_y → haven_gN4
    // When top circles (cir) are active, Ultra bumps r1 UP by _2_5 (0.0635m) to close the
    // gap between the rail and the bottom of the circle geometry.
    // Ultra: if(cir==true){ r1y = htY-_7_5+rH+fsv+_2_5; }
    var hasTopCircles = config.accessories && config.accessories.cir;
    var railT1Final = (styleDef && styleDef.code === 'UAB-200') ? offsetY(HAVEN_RAIL_T1, 0, hOff) : railT1;
    if (hasTopCircles) {
        railT1Final = offsetY(railT1Final, ACCENT_CIRCLE_RAIL_BUMP, 0);
    }
    loadInto(getModelPath('railTop', config), function(geo) {
        [railT0, railT1Final].forEach(function(m) {
            var mesh = new THREE.Mesh(geo, makeMat());
            snap(mesh, m);
            addMesh(mesh);
        });
    });

    // BOTTOM RAILS — per-leaf Y positions (fsv-adjusted)
    loadInto(getModelPath('railBot', config), function(geo) {
        var meshB = new THREE.Mesh(geo, makeMat());
        snap(meshB, railB2);
        addMesh(meshB);

        if (config.accessories && config.accessories.mdr) {
            var meshM = new THREE.Mesh(geo, makeMat());
            snap(meshM, railB0);
            addMesh(meshM);
        }

        if (config.accessories && config.accessories.xlr) {
            var meshX = new THREE.Mesh(geo, makeMat());
            snap(meshX, railB1);
            addMesh(meshX);
        }

        // PUPPY RAIL — positioned per puppy type
        // Ultra: r3 visible when pup==true, Y set by movY per pupI
        if (hasPuppy) {
            var meshP = new THREE.Mesh(geo, makeMat());
            snap(meshP, [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,puppyRailY,0,1]);
            addMesh(meshP);
        }
    });

    // PICKETS — per-leaf Y positions (fsv-adjusted)
    // Odd picket top: only Vanguard (UAF-250) staggers odd pickets lower (f250v=0.205)
    var isVanguard = styleDef && styleDef.code === 'UAF-250';
    var ptOddTransform = (isVanguard && ptOddStagger) ? ptOddStagger : picketTop;

    // Even pickets
    loadInto(getModelPath('ptEven', config), function(geo) {
        var mesh = new THREE.Mesh(geo, makeClipMat(clips.pt, 'pt'));
        snap(mesh, picketTop);
        addMesh(mesh);
    });
    loadInto(getModelPath('pbEven', config), function(geo) {
        var mesh = new THREE.Mesh(geo, makeClipMat(clips.pb, 'pb'));
        snap(mesh, M_IDENTITY);
        addMesh(mesh);
    });

    // Odd pickets
    loadInto(getModelPath('ptOdd', config), function(geo) {
        var mesh = new THREE.Mesh(geo, makeClipMat(clips.pt, 'pt'));
        snap(mesh, ptOddTransform);
        addMesh(mesh);
    });
    loadInto(getModelPath('pbOdd', config), function(geo) {
        var mesh = new THREE.Mesh(geo, makeClipMat(clips.pb, 'pb'));
        snap(mesh, M_IDENTITY);
        addMesh(mesh);
    });

    // Res/extra pickets — visible only for Pro spacing (pi=201, pi=101).
    // ptRes Y position differs per style AND whether circles are active:
    //   UAF-201 normal:      Y = tY + _12 + fsv - _7_5 = -0.4957
    //   UAF-201 with circles: Y = tY + _7_5 + fsv = -0.4195 (moves UP to meet raised r1)
    //   UAS-101 normal:      Y = tY + _12 + fsv = lt.picketTop
    //   UAS-101 with circles: Y = tY + _7_5 + fsv (same bump)
    // pbRes uses separate clip plane for puppy support.
    var isProSpacing = styleDef && (styleDef.code === 'UAF-201' || styleDef.code === 'UAS-101');
    // Ultra: if(cir){ mY(grptx, tY+_7_5+fsv); } — pro pickets move up when circles active
    var ptResTransform;
    if (styleDef && styleDef.code === 'UAF-201') {
        if (hasTopCircles) {
            // tY + _7_5 + fsv = -0.610 + 0.1905 + 0 = -0.4195 (+ hOff for height)
            ptResTransform = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0, -0.4195 + hOff, 0, 1];
        } else {
            ptResTransform = offsetY(PTRES_Y_UAF201, 0, hOff);
        }
    } else if (styleDef && styleDef.code === 'UAS-101') {
        if (hasTopCircles) {
            // tY + _7_5 + fsv = -0.610 + 0.1905 + (-0.152) = -0.5715 (+ hOff)
            ptResTransform = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0, -0.5715 + hOff, 0, 1];
        } else {
            ptResTransform = picketTop;
        }
    } else {
        ptResTransform = picketTop;
    }
    loadInto(getModelPath('ptRes', config), function(geo) {
        var mesh = new THREE.Mesh(geo, makeClipMat(clips.pt, 'pt'));
        snap(mesh, ptResTransform);
        mesh.visible = isProSpacing;
        addMesh(mesh);
    });
    loadInto(getModelPath('pbRes', config), function(geo) {
        var mesh = new THREE.Mesh(geo, makeClipMat(clips.pbRes, 'pbRes'));
        snap(mesh, M_IDENTITY);
        // Ultra: grpbx visible for Pro spacing OR puppy pickets
        // When puppy is active, these bottom extra pickets fill the gap
        // between the bottom rail and the puppy rail (clipped by pbRes plane)
        mesh.visible = !!(isProSpacing || hasPuppy);
        addMesh(mesh);
    });

    // PUPPY FINIALS — classic puppy variants get decorative finials on the extra pickets
    // Ultra: dpfin() loads finial model per puppy type, places at pf1/pf2 (or pf1s/pf2s
    // for staggered) positions, with Y = r3y + 0.076
    // Model mapping: plg/pls→fp, spe/sps→fs, tri/trs→ft, qua/qus→fq
    if (isClassicPuppy && pupId) {
        var isStaggeredPuppy = ['pls','sps','trs','qus'].indexOf(pupId) !== -1;
        var pfKey = isStaggeredPuppy ? (leaf + 's') : leaf;
        var pfPositions = PUPPY_FINIAL_POSITIONS[pfKey];
        var pfBaseY = puppyRailY + PUPPY_FINIAL_OFFSET_Y;
        var pfModelMap = {plg:'fp',pls:'fp',spe:'fs',sps:'fs',tri:'ft',trs:'ft',qua:'fq',qus:'fq'};
        var pfModel = pfModelMap[pupId] || 'fp';

        if (pfPositions) {
            loadInto('gate_tool/m/3/' + pfModel + '.json', function(geo) {
                pfPositions.forEach(function(pos) {
                    var mesh = new THREE.Mesh(geo, makeMat());
                    mesh.position.set(pos[0], pfBaseY + pos[1], pos[2]);
                    addMesh(mesh);
                });
            });
        }
    }

    // UPPER FILLER RAIL
    if (config.accessories && config.accessories.ufr) {
        loadInto(getModelPath('ufr', config), function(geo) {
            var mesh = new THREE.Mesh(geo, makeMat());
            snap(mesh, M_IDENTITY);
            addMesh(mesh);
        });
    }

    // FINIALS — exact positions from Ultra's global position arrays.
    // Ultra uses absolute XYZ positions per leaf+arch combo (both sides included).
    // Category determines which lookup table: spear family uses 'b' prefix,
    // Vanguard (flat w/ spears, mod=250) uses 'f250' prefix.
    if (config.finial && hasFinials) {
        // Ultra's dfin(): stg → 'st'+lfI+arI, modI=='250' → 'f250_'+lfI+arI, else → 'b'+lfI+arI
        var finCategory = styleDef.isStaggered ? 'staggered' :
                          (styleDef.category === 'spear') ? 'spear' : 'flat';
        var finLeafPositions = FINIAL_POSITIONS[finCategory] && FINIAL_POSITIONS[finCategory][leaf];
        var finPositions = finLeafPositions && finLeafPositions[archId];
        var finBaseY = FINIAL_BASE_Y[finCategory] || 1.412;

        if (finPositions) {
            loadInto(getModelPath('finial', config), function(geo) {
                finPositions.forEach(function(pos) {
                    var mesh = new THREE.Mesh(geo, makeMat());
                    snap(mesh, [1,0,0,0, 0,1,0,0, 0,0,1,0, pos[0], finBaseY + pos[1] + hOff, pos[2], 1]);
                    addMesh(mesh);
                });
            });
        }
    }

    // ACCESSORIES
    // Top accents sit between the two top rails → they need full fsv + hOff.
    // ACCENT_BASE_Y values were measured at 60" flat (fsv=0, hOff=0).
    //   circle:    1.397 ≈ (railT0 + railT1) / 2 = (1.489 + 1.2985) / 2
    //   butterfly: 1.363 (slightly lower within same rail gap)
    // Scroll Y: Ultra uses midpoint of r1y and r4y: (r1y/2) + (r4y/2)
    // Base accents are anchored near the bottom rail → no offset needed.
    var accentTopOffset = fsv + hOff;
    // Scroll Y: midpoint between second rail (r1) and bottom rail (r4)
    // Ultra: mY(gracs, (r1y/2)+(r4y/2)-rAdj) where rAdj=0 for standard, 0.152 for royal
    var r1yActual = railT1Final[13];  // Y from the Matrix4 (index 13)
    var r4yActual = railB2[13];       // bottom rail Y
    var rAdj = (archId === 'r') ? 0.152 : 0;
    var scrollY = (r1yActual / 2) + (r4yActual / 2) - rAdj;
    if (config.accessories) {
        // SCROLL — Ultra position arrays: scr2 = '-0.844,0,0*0.844,0,0' (double)
        //                                  scr1 = '0.889,0,0*0,0,0*-0.889,0,0' (single)
        if (config.accessories.scr) {
            var scrollPositions = isDoubleLeaf
                ? [[-0.844, 0], [0.844, 0]]
                : [[0.889, 0], [0, 0], [-0.889, 0]];
            loadInto(getModelPath('scroll', config), function(geo) {
                scrollPositions.forEach(function(pos) {
                    var mesh = new THREE.Mesh(geo, makeMat());
                    snap(mesh, [1,0,0,0, 0,1,0,0, 0,0,1,0, pos[0],scrollY,0,1]);
                    addMesh(mesh);
                });
            });
        }
        // CIRCLE (top) — position arrays from Ultra, per leaf+arch
        // Ultra: grpac.position.y = acY which varies with fsv and height
        if (config.accessories.cir) {
            var circlePositions = ACCENT_POSITIONS.circle[leaf] && ACCENT_POSITIONS.circle[leaf][archId];
            if (circlePositions) {
                loadInto(getModelPath('circle', config), function(geo) {
                    circlePositions.forEach(function(pos) {
                        var mesh = new THREE.Mesh(geo, makeMat());
                        mesh.position.set(pos[0], ACCENT_BASE_Y.circle + pos[1] + accentTopOffset, pos[2]);
                        addMesh(mesh);
                    });
                });
            }
        }
        // CIRCLES AT BASE — anchored near bottom rail, no fsv/hOff offset
        if (config.accessories.bcr) {
            var circleBasePositions = ACCENT_POSITIONS.circle[leaf] && ACCENT_POSITIONS.circle[leaf][archId];
            if (circleBasePositions) {
                loadInto(getModelPath('circle', config), function(geo) {
                    circleBasePositions.forEach(function(pos) {
                        var mesh = new THREE.Mesh(geo, makeMat());
                        mesh.position.set(pos[0], ACCENT_CIRCLE_BOTTOM_Y, pos[2]);
                        addMesh(mesh);
                    });
                });
            }
        }
        // BUTTERFLY (top) — position arrays from Ultra, per leaf+arch
        if (config.accessories.but) {
            var butterflyPositions = ACCENT_POSITIONS.butterfly[leaf] && ACCENT_POSITIONS.butterfly[leaf][archId];
            if (butterflyPositions) {
                loadInto(getModelPath('butterfly', config), function(geo) {
                    butterflyPositions.forEach(function(pos) {
                        var mesh = new THREE.Mesh(geo, makeMat());
                        mesh.position.set(pos[0], ACCENT_BASE_Y.butterfly + pos[1] + accentTopOffset, pos[2]);
                        addMesh(mesh);
                    });
                });
            }
        }
        // BUTTERFLIES AT BASE — anchored near bottom rail, no offset
        if (config.accessories.bbu) {
            var butterflyBasePositions = ACCENT_POSITIONS.butterfly[leaf] && ACCENT_POSITIONS.butterfly[leaf][archId];
            if (butterflyBasePositions) {
                loadInto(getModelPath('butterfly', config), function(geo) {
                    butterflyBasePositions.forEach(function(pos) {
                        var mesh = new THREE.Mesh(geo, makeMat());
                        mesh.position.set(pos[0], ACCENT_BUTTERFLY_BOTTOM_Y, pos[2]);
                        addMesh(mesh);
                    });
                });
            }
        }
    }
};

export default GateRenderer;
