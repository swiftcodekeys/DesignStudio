// OrbitControls for Three.js r86 — minimal, standalone implementation
// Only camera rotation, zoom, and pan. Does not modify the scene.

function OrbitControls(camera, domElement) {
    var THREE = window.THREE;

    this.camera = camera;
    this.domElement = domElement;
    this.enabled = true;

    this.target = new THREE.Vector3(0, 1.1, 0);

    this.enableDamping = true;
    this.dampingFactor = 0.05;

    this.minDistance = 3;
    this.maxDistance = 15;
    this.minPolarAngle = 0.1;
    this.maxPolarAngle = Math.PI / 2;

    this.enableZoom = true;
    this.zoomSpeed = 1.0;
    this.enableRotate = true;
    this.rotateSpeed = 0.8;
    this.enablePan = true;
    this.panSpeed = 0.5;

    // Internal state
    var scope = this;
    var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2 };
    var state = STATE.NONE;

    var spherical = { radius: 0, theta: 0, phi: 0 };
    var sphericalDelta = { theta: 0, phi: 0 };
    var panOffset = new THREE.Vector3();
    var scale = 1;

    var rotateStart = new THREE.Vector2();
    var rotateEnd = new THREE.Vector2();
    var panStart = new THREE.Vector2();
    var panEnd = new THREE.Vector2();

    // Compute initial spherical from camera position
    function updateSpherical() {
        var offset = new THREE.Vector3().copy(scope.camera.position).sub(scope.target);
        spherical.radius = offset.length();
        spherical.theta = Math.atan2(offset.x, offset.z);
        spherical.phi = Math.acos(Math.max(-1, Math.min(1, offset.y / spherical.radius)));
    }
    updateSpherical();

    this.update = function() {
        if (!scope.enabled) return;

        spherical.theta += sphericalDelta.theta;
        spherical.phi += sphericalDelta.phi;

        // Clamp phi
        spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));

        spherical.radius *= scale;
        spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius));

        scope.target.add(panOffset);

        var sinPhi = Math.sin(spherical.phi);
        var offset = new THREE.Vector3(
            spherical.radius * sinPhi * Math.sin(spherical.theta),
            spherical.radius * Math.cos(spherical.phi),
            spherical.radius * sinPhi * Math.cos(spherical.theta)
        );

        scope.camera.position.copy(scope.target).add(offset);
        scope.camera.lookAt(scope.target);

        // Damping
        if (scope.enableDamping) {
            sphericalDelta.theta *= (1 - scope.dampingFactor);
            sphericalDelta.phi *= (1 - scope.dampingFactor);
            panOffset.multiplyScalar(1 - scope.dampingFactor);
        } else {
            sphericalDelta.theta = 0;
            sphericalDelta.phi = 0;
            panOffset.set(0, 0, 0);
        }
        scale = 1;
    };

    this.reset = function() {
        scope.camera.position.set(0.82, 1.27, 7.2);
        scope.target.set(0, 1.1, 0);
        updateSpherical();
        scope.camera.lookAt(scope.target);
    };

    // Event handlers
    function onMouseDown(event) {
        if (!scope.enabled) return;
        event.preventDefault();
        if (event.button === 0) {
            state = STATE.ROTATE;
            rotateStart.set(event.clientX, event.clientY);
        } else if (event.button === 2) {
            state = STATE.PAN;
            panStart.set(event.clientX, event.clientY);
        }
        document.addEventListener('mousemove', onMouseMove, false);
        document.addEventListener('mouseup', onMouseUp, false);
    }

    function onMouseMove(event) {
        if (!scope.enabled) return;
        if (state === STATE.ROTATE) {
            rotateEnd.set(event.clientX, event.clientY);
            var dx = rotateEnd.x - rotateStart.x;
            var dy = rotateEnd.y - rotateStart.y;
            sphericalDelta.theta -= (2 * Math.PI * dx / domElement.clientWidth) * scope.rotateSpeed;
            sphericalDelta.phi -= (Math.PI * dy / domElement.clientHeight) * scope.rotateSpeed;
            rotateStart.copy(rotateEnd);
        } else if (state === STATE.PAN) {
            panEnd.set(event.clientX, event.clientY);
            var dx2 = panEnd.x - panStart.x;
            var dy2 = panEnd.y - panStart.y;
            var panDist = scope.panSpeed * 0.005;
            // Pan in camera plane
            var right = new THREE.Vector3();
            right.setFromMatrixColumn(scope.camera.matrix, 0);
            var up = new THREE.Vector3();
            up.setFromMatrixColumn(scope.camera.matrix, 1);
            panOffset.add(right.multiplyScalar(-dx2 * panDist));
            panOffset.add(up.multiplyScalar(dy2 * panDist));
            panStart.copy(panEnd);
        }
    }

    function onMouseUp() {
        state = STATE.NONE;
        document.removeEventListener('mousemove', onMouseMove, false);
        document.removeEventListener('mouseup', onMouseUp, false);
    }

    function onWheel(event) {
        if (!scope.enabled || !scope.enableZoom) return;
        event.preventDefault();
        if (event.deltaY > 0) {
            scale *= (1 + 0.05 * scope.zoomSpeed);
        } else {
            scale /= (1 + 0.05 * scope.zoomSpeed);
        }
    }

    // Touch support
    var touchState = STATE.NONE;
    var touchStartDist = 0;

    function onTouchStart(event) {
        if (!scope.enabled) return;
        if (event.touches.length === 1) {
            touchState = STATE.ROTATE;
            rotateStart.set(event.touches[0].clientX, event.touches[0].clientY);
        } else if (event.touches.length === 2) {
            touchState = STATE.ZOOM;
            var dx = event.touches[0].clientX - event.touches[1].clientX;
            var dy = event.touches[0].clientY - event.touches[1].clientY;
            touchStartDist = Math.sqrt(dx * dx + dy * dy);
        }
    }

    function onTouchMove(event) {
        if (!scope.enabled) return;
        event.preventDefault();
        if (touchState === STATE.ROTATE && event.touches.length === 1) {
            rotateEnd.set(event.touches[0].clientX, event.touches[0].clientY);
            var dx = rotateEnd.x - rotateStart.x;
            var dy = rotateEnd.y - rotateStart.y;
            sphericalDelta.theta -= (2 * Math.PI * dx / domElement.clientWidth) * scope.rotateSpeed;
            sphericalDelta.phi -= (Math.PI * dy / domElement.clientHeight) * scope.rotateSpeed;
            rotateStart.copy(rotateEnd);
        } else if (touchState === STATE.ZOOM && event.touches.length === 2) {
            var dx2 = event.touches[0].clientX - event.touches[1].clientX;
            var dy2 = event.touches[0].clientY - event.touches[1].clientY;
            var dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            var ratio = touchStartDist / dist;
            scale *= ratio;
            touchStartDist = dist;
        }
    }

    function onTouchEnd() {
        touchState = STATE.NONE;
    }

    function onContextMenu(event) {
        event.preventDefault();
    }

    domElement.addEventListener('mousedown', onMouseDown, false);
    domElement.addEventListener('wheel', onWheel, { passive: false });
    domElement.addEventListener('touchstart', onTouchStart, { passive: false });
    domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    domElement.addEventListener('touchend', onTouchEnd, false);
    domElement.addEventListener('contextmenu', onContextMenu, false);

    this.dispose = function() {
        domElement.removeEventListener('mousedown', onMouseDown, false);
        domElement.removeEventListener('wheel', onWheel);
        domElement.removeEventListener('touchstart', onTouchStart);
        domElement.removeEventListener('touchmove', onTouchMove);
        domElement.removeEventListener('touchend', onTouchEnd);
        domElement.removeEventListener('contextmenu', onContextMenu);
    };
}

export default OrbitControls;
