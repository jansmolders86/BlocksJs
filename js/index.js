
'use strict';

Physijs.scripts.worker = 'js/vendor/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

// global variables
var scene, camera, renderer, controls, sprite, box, material,effect, element, controller, hemiLight, dirLight;
var gravity = -50;
var textureLoader = new THREE.TextureLoader();
var screenWidth = window.innerWidth;
var screenHeight = window.innerHeight;
var container = document.getElementById('viewport');
var boxStartHeight = 80;
var supportsTouch = 'ontouchstart' in window || navigator.msMaxTouchPoints;

var lightDirection = 30;
// Manipulation variables
var blocks = [],
    selected_block = null,
    cursorPosition = new THREE.Vector3,
    block_offset = new THREE.Vector3,
    newVector = new THREE.Vector3, intersect_plane;

// global events

var webglAvailable  = ( function () { try { var canvas = document.createElement( 'canvas' ); return !! window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) ); } catch( e ) { return false; } } )();

if (webglAvailable) {
    window.addEventListener('load', init, false);
}

window.addEventListener('resize', onWindowResize, false);

window.widgets = new LeapWidgets(window.scene);
widgets.initLeapHand(
    {
        scale: 0.09
    }
);

// Scene
//
// var text = widgets.createLabel("LeapJS Widgets - Knob", new THREE.Vector3(0, wall.position.y+wall.geometry.parameters.height/2-16, wall.position.z+wall.geometry.parameters.depth/2+1), 16, 0xffffff);
//
//
function init(event) {
    createScene();
    createLights();
    createGround();
    createSkyBox();
    createObject('box');
    activeIndicator();
    initEventHandling();
    //Show gravity
    document.getElementById('gravity').innerHTML = gravity;

    //Add the listener
    document.getElementById('add-box').addEventListener('click', function(){createObject('box')}, false);
    document.getElementById('add-plank').addEventListener('click', function(){createObject('plank')}, false);
    document.getElementById('btn-zero').addEventListener('click', function(){changeGravity('zero')}, false);
    document.getElementById('btn-lots').addEventListener('click', function(){changeGravity('lots')}, false);
    document.getElementById('btn-more').addEventListener('click', function(){changeGravity('decrease')}, false);
    document.getElementById('btn-less').addEventListener('click', function(){changeGravity('increase')}, false);
    document.addEventListener('keyup', keyboardEvents, false);

    animate();
}

function createScene() {
    scene = new Physijs.Scene;
    scene.setGravity(new THREE.Vector3(0, gravity, 0));

    setUpCamera();
    window.addEventListener('deviceorientation', setOrientationControls, true);

    scene.addEventListener(
        'update',
        function () {
            scene.setGravity(new THREE.Vector3(0, gravity, 0));
            if (selected_block !== null) {
                newVector.copy(cursorPosition).add(block_offset).sub(selected_block.position).multiplyScalar(3);
                selected_block.setLinearVelocity(newVector);

                // Reactivate all of the blocks
                newVector.set(0, 0, 0);
                for (var i = 0; i < selected_block.length; i++) {
                    blocks[i].applyCentralImpulse(newVector);
                }
            }

            scene.simulate(undefined, 1);
        }
    );

    // collision and handling
    intersect_plane = new THREE.Mesh(
        new THREE.PlaneGeometry(150, 150),
        new THREE.MeshBasicMaterial({opacity: 0, transparent: true})
    );
    intersect_plane.rotation.x = Math.PI / -2;

    scene.add(intersect_plane);
    scene.fog=new THREE.Fog( 0x000000, 0.015, 300 );

    //realistic sky
   // scene.fog = new THREE.Fog(0x222233, 0, 400);

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );

    if(renderVR === true){
        effect = new THREE.StereoEffect( renderer );
        effect.setSize( window.innerWidth, window.innerHeight );
    } else {
         renderer.setSize(screenWidth, screenHeight);
         renderer.shadowMap.enabled = true;
         renderer.shadowMapSoft = true;
         renderer.gammaInput = true;
         renderer.gammaOutput = true;
         renderer.shadowMap.renderReverseSided = THREE.CullFaceBack;
    }

    element = renderer.domElement;
    container.appendChild(renderer.domElement);
    scene.simulate();
}

function createSkyBox(){
    var vertexShader = document.getElementById( 'vertexShader' ).textContent;
    var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
    var uniforms = {
        //realistic sky
       // topColor:    { type: "c", value: new THREE.Color( 0x0077ff ) },
       // bottomColor: { type: "c", value: new THREE.Color( 0xffffff ) },
        topColor:    { type: "c", value: new THREE.Color( 0x2e2f31 ) },
        bottomColor: { type: "c", value: new THREE.Color( 0x26221f ) },
        offset:      { type: "f", value: 33 },
        exponent:    { type: "f", value: 2 }
    };
    uniforms.topColor.value.copy( hemiLight.color );
    scene.fog.color.copy( uniforms.bottomColor.value );
    var skyGeo = new THREE.SphereGeometry( 400, 32, 15 );
    var skyMat = new THREE.ShaderMaterial( { vertexShader: vertexShader, fragmentShader: fragmentShader, uniforms: uniforms, side: THREE.BackSide } );
    var sky = new THREE.Mesh( skyGeo, skyMat );
    scene.add( sky );
}

function setUpCamera(){
    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        1,
        10000
    );
    camera.position.x = 1;
    camera.position.y = 15;
    camera.position.z = 40;

    controls = new THREE.OrbitControls(camera, element);
    controls.enablePan = true;
    controls.enableZoom = false;
}

function createLights() {
    // Light
    hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.05 );
    hemiLight.color.setHSL( 0.6, 1, 0.6 );
    hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
    hemiLight.position.set( 0, 500, 0 );
    scene.add( hemiLight );

    // this is the Sun
    dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
    dirLight.color.setHSL( 0.1, 1, 0.95 );
    dirLight.position.set( -1, 0.75, 1 );
    dirLight.position.multiplyScalar( 50 );
    scene.add( dirLight );
    dirLight.shadow.camera.visible = true;
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = dirLight.shadow.mapSize.height = 1024*2;
    dirLight.shadow.camera.left = -lightDirection;
    dirLight.shadow.camera.right = lightDirection;
    dirLight.shadow.camera.top = lightDirection;
    dirLight.shadow.camera.bottom = -lightDirection;
    dirLight.shadow.cameraFar = 3500;
    dirLight.shadow.bias = -0.000001;
    dirLight.shadow.darkness = 0.35;
    scene.add( dirLight );
}

function setOrientationControls(e) {
    if (!e.alpha) {
        return;
    }
    controls = new THREE.DeviceOrientationControls(camera, true);
    controls.connect();
    controls.update();

    window.removeEventListener('deviceorientation', setOrientationControls, true);
}

function createGround() {
    var ground_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({map:textureLoader.load( "images/floor.jpg" ), shading: THREE.FlatShading}),
        1, // high friction
        .3 // low restitution
    );
    ground_material.map.wrapS = ground_material.map.wrapT = THREE.RepeatWrapping;
    ground_material.map.repeat.set(18, 18);

    var ground = new Physijs.BoxMesh(
        new THREE.BoxGeometry(400, 1, 400),
        ground_material,
        0, // mass
        { restitution: 1,
        friction:1}
);
    ground.receiveShadow = true;
    ground.setDamping(1,1);
    scene.add(ground);
}

function createObject(type) {
    var box_geometry, lengthDimensions, thickness;
    var randomDimensions = Math.floor(Math.random() * 6) + 1  ;
    var creationMaterial = new THREE.MeshBasicMaterial({
            color: 0xe97325,
            shading: THREE.FlatShading,
            wireframe: true,
            wireframeLinewidth : 20
        },   1, // medium friction
        0 // low restitution
    );

    if(type === 'box'){
        lengthDimensions = randomDimensions;
        thickness = randomDimensions;
    } else if(type === 'plank'){
        lengthDimensions = randomDimensions * 2 +1;
        thickness = randomDimensions / 2 - 1;
    }

    box_geometry = new THREE.BoxGeometry(randomDimensions, lengthDimensions, thickness);

    var box = new Physijs.BoxMesh(
        box_geometry,
        creationMaterial
    );
    box.collisions = 0;
    box.position.set(
        Math.random() * 20 - 7.5,
        boxStartHeight,
        Math.random() * 20 - 7.5
    );

    box.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
    );

    box.receiveShadow = true;
    box.castShadow = true;
    box.addEventListener( 'collision', function(){
        handleCollision(box)
    });
    scene.add(box);
    blocks.push(box);
}

function activeIndicator(){
    var spriteMaterial = new THREE.SpriteMaterial( { map: textureLoader.load( "images/glow.png" ), color: 0xe97325, transparent: true, blending: THREE.AdditiveBlending} );
    sprite = new THREE.Sprite( spriteMaterial );
}

function handleCollision(box){
    box.material.color.setHex(0x4f4f4f);
    box.material.wireframe = false;
    box.material.map = textureLoader.load( "images/cube.jpg" );
    box.material.needsUpdate = true;
}

function animate() {
    requestAnimationFrame(animate);
    scene.setGravity(new THREE.Vector3(0, gravity, 0));
    controls.update();

    if(renderVR === true) {
        effect.render(scene, camera);
    } else{
        renderer.render(scene, camera);
    }
}


// Events
//
//
//
//
function initEventHandling() {
    var _vector = new THREE.Vector3;
    renderer.domElement.addEventListener('mousedown', function (evt) {
        grabHandler(evt, _vector);
    });
    renderer.domElement.addEventListener('touchstart', function (evt) {
        grabHandler(evt, _vector);
    });
    renderer.domElement.addEventListener('mousemove', function (evt) {
        dragHandler(evt, _vector);
    });
    renderer.domElement.addEventListener('touchmove', function (evt) {
        dragHandler(evt, _vector);
    });
    renderer.domElement.addEventListener('mouseup', function (evt) {
        letGoHandler(evt, _vector);
    });
    renderer.domElement.addEventListener('touchend', function (evt) {
        letGoHandler(evt, _vector);
    });
}

function keyboardEvents(evt) {
    if(evt.keyCode == 189 || evt.keyCode == 109){
        changeGravity('increase');
    } else if(evt.keyCode == 187 || evt.keyCode == 107){
        changeGravity('decrease');
    }
}

function letGoHandler(evt, _vector) {
    if (selected_block !== null) {
        _vector.set(1, 1, 1);
        selected_block.setAngularFactor(_vector);
        selected_block.setLinearFactor(_vector);
        selected_block.remove(sprite);
        selected_block.material.map = textureLoader.load( "images/cube.jpg" );
        selected_block.material.needsUpdate = true;
        selected_block = null;
    }
}

function dragHandler(evt, _vector) {
    var ray, intersection;
    if (selected_block !== null ) {
        var evtX, evtY;
        if(supportsTouch) {
            evtX = evt.touches[0].clientX;
            evtY = evt.touches[0].clientY
        } else {
            evtX = evt.clientX;
            evtY = evt.clientY
        }

        _vector.set(
            ( evtX/ screenWidth ) * 2 - 1,
            -( evtY / screenHeight ) * 2 + 1,
            1
        );
        _vector.unproject(camera);
        ray = new THREE.Raycaster(camera.position, _vector.sub(camera.position).normalize());
        intersection = ray.intersectObject(intersect_plane);
        cursorPosition.copy(intersection[0].point);
    }
}

function grabHandler(evt, _vector) {
    var evtX, evtY;
    if(supportsTouch) {
        evtX = evt.touches[0].clientX;
        evtY = evt.touches[0].clientY
    } else {
        evtX = evt.clientX;
        evtY = evt.clientY
    }

    _vector.set(
        ( evtX/ screenWidth ) * 2 - 1,
        -( evtY / screenHeight ) * 2 + 1,
        1
    );

    _vector.unproject(camera);

    var ray = new THREE.Raycaster(camera.position, _vector.sub(camera.position).normalize());
    var intersections = ray.intersectObjects(blocks);

    if (intersections.length > 0) {
        selected_block = intersections[0].object;

        // swap texture
        selected_block.material.map = textureLoader.load( "images/active-cube.jpg" );
        selected_block.material.needsUpdate = true;

        // show highlight sprite
        sprite.scale.set( 2, 60, 1.0 );
        selected_block.add(sprite);

        _vector.set(0, 0, 0);
        selected_block.setAngularFactor(_vector);
        selected_block.setAngularVelocity(_vector);
        selected_block.setLinearFactor(_vector);
        selected_block.setLinearVelocity(_vector);

        cursorPosition.copy(intersections[0].point);
        block_offset.subVectors(selected_block.position, cursorPosition);

        intersect_plane.position.y = cursorPosition.y;
        intersect_plane.position.x = cursorPosition.x;
    }
}


// Helpers
//
//
///
function changeGravity(type){
    if(type === 'increase'){
        gravity = gravity + 10;
    } else if(type === 'decrease'){
        gravity = gravity - 10;
    } else if(type === 'zero'){
        gravity = 0;
    } else if(type === 'lots'){
        gravity =  -50;
    }

    document.getElementById('gravity').innerHTML = gravity;
    scene.setGravity(new THREE.Vector3(0, gravity, 0));
    scene.simulate();
}

// Resize handler
//
//
function onWindowResize() {
    var HEIGHT = window.innerHeight;
    var WIDTH = window.innerWidth;

    camera.aspect = WIDTH / HEIGHT;
    camera.updateProjectionMatrix();
    renderer.setSize(WIDTH, HEIGHT);

    if(renderVR){
        effect.setSize(WIDTH, HEIGHT);
    }
}


