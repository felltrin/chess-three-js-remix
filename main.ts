import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Chess } from 'chess.js';


window.addEventListener('DOMContentLoaded', main);

let renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    board: THREE.Group,
    controls: OrbitControls,
    chess: Chess;

const FILES = {
    0: 'a',
    1: 'b',
    2: 'c',
    3: 'd',
    4: 'e',
    5: 'f',
    6: 'g',
    7: 'h',
}

const RANKS = {
    0: '1',
    1: '2',
    2: '3',
    3: '4',
    4: '5',
    5: '6',
    6: '7',
    7: '8',
}

function main(): void {
    chess = new Chess();

    const canvas = document.querySelector('#c');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.set(0, 1, 3);
    camera.position.y = 8;
    camera.position.set(4.5, 5, 4.5);
    camera.lookAt( 5, 0, 5 );

    renderer = new THREE.WebGLRenderer( { antialias: true, canvas } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    const square = new THREE.BoxGeometry( 1, 0.1, 1 );
    const lightSquare = new THREE.MeshBasicMaterial( { color: 0xE0C4A8 } );
    const darkSquare = new THREE.MeshBasicMaterial( { color: 0x6A4236 } );

    board = new THREE.Group();
    let squarePosition: string = "";
    for ( let x = 0; x < 8; x++ ) {
        for ( let z = 0; z < 8; z++ ) {
            let cube: THREE.Mesh;
            if ( z % 2 !== 0 ) {
                cube = new THREE.Mesh( square, x % 2 === 0 ? lightSquare : darkSquare );
                squarePosition = FILES[z] + RANKS[x];
                cube.userData.square = squarePosition;
            } else {
                cube = new THREE.Mesh( square, x % 2 === 0 ? darkSquare : lightSquare );
                squarePosition = FILES[z] + RANKS[x];
                cube.userData.square = squarePosition;
            }

            cube.position.set( x, 0, z );
            board.add( cube );
        }
    }
    scene.add( board );

    const loader = new GLTFLoader();
    loader.load("pieces/chess.glb", function( gltf ) {
        const pawnMesh = gltf.scene.children.find((child) => child.name === "pawn");
        // const pawnMesh = gltf.scene;
        pawnMesh.scale.set( pawnMesh.scale.x * 0.2, pawnMesh.scale.y * 0.2, pawnMesh.scale.z * 0.2 );
        pawnMesh.position.z = 7;
        pawnMesh.position.x = 1;
        // scene.add( pawnMesh.children.find((child) => child.name === "pawn") );
        addPieces(pawnMesh);
    });

    const light = new THREE.PointLight(0xffffff, 20, 200);
    light.position.set( 4.5, 10, 4.5 );
    scene.add( light );

    controls = new OrbitControls( camera, canvas );
    controls.target.set( 3.5, 0, 3.5 );
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI / 2;
    controls.enableDamping = true;

    requestAnimationFrame(animate);
}

function positionForSquare( square ) {
    const found = board.children.find((child) => child.userData.square === square);
    if ( found ) {
        return found.position;
    }
    return null;
}

function addPieces( pieceMesh: THREE.Mesh ) {
    let boardCubes = board.children;
    for (let i = 0; i < 64; i++ ) {
        let currentSquare = boardCubes[i].userData.square;
        let pieceOn = chess.get( currentSquare );
        const piece = pieceMesh.clone(true);
        const squarePosition = positionForSquare( currentSquare);

        switch ( pieceOn.type ) {
            case 'p':
                if ( pieceOn.color === 'b' ) {
                    piece.material = new THREE.MeshStandardMaterial( { color: 0x222222 } );
                    piece.userData.color = 'b';
                    piece.position.set( squarePosition.x, piece.position.y, squarePosition.z );
                    scene.add(piece);
                } else if ( pieceOn.color === 'w' ) {
                    piece.material = new THREE.MeshStandardMaterial( { color: 0xeeeeee } );
                    piece.userData.color = 'w';
                    piece.position.set( squarePosition.x, piece.position.y, squarePosition.z );
                    scene.add(piece);
                }
                piece.userData.currentSquare = currentSquare;
                break;
            default:
                console.log("square has no piece starting on it");
        }
    }
}


function animate(): void {
    controls.update();
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }

    renderer.render( scene, camera );
    requestAnimationFrame(animate);
}

function resizeRendererToDisplaySize( renderer: THREE.WebGLRenderer ): boolean {
    const canvas = renderer.domElement;
    const pixelRatio = window.devicePixelRatio;
    const width  = Math.floor( canvas.clientWidth  * pixelRatio );
    const height = Math.floor( canvas.clientHeight * pixelRatio );
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}


