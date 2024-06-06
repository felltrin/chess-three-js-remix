import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Chess, Square, Piece } from 'chess.js';


window.addEventListener('DOMContentLoaded', main);

let renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    board: THREE.Group,
    controls: OrbitControls,
    chess: Chess,
    pointer: THREE.Vector2,
    raycaster: THREE.Raycaster,
    selectedPiece: Square | null = null;

const FILES: Record<number, string> = {
    0: 'a',
    1: 'b',
    2: 'c',
    3: 'd',
    4: 'e',
    5: 'f',
    6: 'g',
    7: 'h',
}

const RANKS: Record<number, string> = {
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

    const canvas: Element = document.querySelector('#c');
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    camera.position.set(0, 1, 3);
    camera.position.y = 8;
    camera.position.set(4.5, 5, 4.5);
    camera.lookAt( 5, 0, 5 );

    renderer = new THREE.WebGLRenderer( { antialias: true, canvas } );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );

    pointer = new THREE.Vector2();
    raycaster = new THREE.Raycaster();

    const square: THREE.BoxGeometry = new THREE.BoxGeometry( 1, 0.1, 1 );
    const lightSquare: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial( { color: 0xE0C4A8 } );
    const darkSquare: THREE.MeshBasicMaterial = new THREE.MeshBasicMaterial( { color: 0x6A4236 } );

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

    const loader: GLTFLoader = new GLTFLoader();
    loader.load("pieces/chess.glb", function( gltf: GLTF ): void {
        const chessMesh = gltf.scene;
        addPieces(chessMesh);
    });

    const light: THREE.PointLight = new THREE.PointLight(0xffffff, 200, 200);
    light.position.set( 4.5, 10, 4.5 );
    scene.add( light );

    controls = new OrbitControls( camera, canvas );
    controls.target.set( 3.5, 0, 3.5 );
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI / 2;
    controls.enableDamping = true;

    window.addEventListener( 'pointermove', onPointerMove );
    window.addEventListener( 'click', onClick );

    requestAnimationFrame(animate);
}

function positionForSquare( square: string ): THREE.Mesh {
    const found: THREE.Mesh = board.children.find((child) => child.userData.square === square);
    if ( found ) {
        return found.position;
    }
    return null;
}

function addPieces( pieceMesh: THREE.Mesh ): void {
    let boardCubes: THREE.Mesh[] = board.children;
    for (let i = 0; i < 64; i++ ) {
        let currentSquare: Square = boardCubes[i].userData.square;
        let pieceOn: Piece = chess.get( currentSquare );
        const piece: THREE.Mesh = pieceMesh.clone(true);
        const squarePosition: THREE.Mesh = positionForSquare( currentSquare );

        switch ( pieceOn.type ) {
            case 'p':
                addPiece( piece, 0.2, pieceOn, "pawn", squarePosition, currentSquare );
                break;
            case 'r':
                addPiece( piece, 0.15, pieceOn, "rook", squarePosition, currentSquare );
                break;
            case 'n':
                const knightMesh: THREE.Mesh = piece.children.find((child) => child.name === "knight");
                knightMesh.scale.set( knightMesh.scale.x * 0.15, knightMesh.scale.y * 0.15, knightMesh.scale.z * 0.15 );
                if ( pieceOn.color === 'b' ) {
                    knightMesh.material = new THREE.MeshStandardMaterial( { color: 0x222222, transparent: true,
                        opacity: 1.0 } );
                    knightMesh.userData.color = 'b';
                    knightMesh.position.set( squarePosition.x, knightMesh.position.y, squarePosition.z );
                    scene.add(knightMesh);
                } else if ( pieceOn.color === 'w' ) {
                    knightMesh.rotation.z = Math.PI;
                    knightMesh.material = new THREE.MeshStandardMaterial( { color: 0xEEEEEE, transparent: true,
                        opacity: 1.0 } );
                    knightMesh.userData.color = 'w';
                    knightMesh.position.set( squarePosition.x, knightMesh.position.y, squarePosition.z );
                    scene.add(knightMesh);
                }
                knightMesh.userData.currentSquare = currentSquare;
                break;
            case 'b':
                addPiece( piece, 0.175, pieceOn, "bishop", squarePosition, currentSquare );
                break;
            case "q":
                addPiece( piece, 0.14, pieceOn, "queen", squarePosition, currentSquare );
                break;
            case "k":
                addPiece( piece, 0.14, pieceOn, "king", squarePosition, currentSquare );
                break;
            default:
                console.log("square has no piece starting on it");
                break;
        }
    }
}

function addPiece( pieces: THREE.Mesh,
                   scale: number,
                   pieceOn: Piece,
                   piece: string,
                   squarePosition: THREE.Mesh,
                   currentSquare: Square ): void {
    const mesh: THREE.Mesh = pieces.children.find((child) => child.name === `${piece}`);
    mesh.scale.set( mesh.scale.x * scale, mesh.scale.y * scale, mesh.scale.z * scale );
    if ( pieceOn.color === 'b' ) {
        mesh.material = new THREE.MeshStandardMaterial( { color: 0x222222, transparent: true, opacity: 1.0 } );
        mesh.userData.color = 'b';
        mesh.position.set( squarePosition.x, mesh.position.y, squarePosition.z );
        scene.add(mesh);
    } else if ( pieceOn.color === 'w' ) {
        mesh.material = new THREE.MeshStandardMaterial( { color: 0xEEEEEE, transparent: true, opacity: 1.0 } );
        mesh.userData.color = 'w';
        mesh.position.set( squarePosition.x, mesh.position.y, squarePosition.z );
        scene.add(mesh);
    }
    mesh.userData.currentSquare = currentSquare;
}

function resetMaterials() {
    for ( let i = 0; i < scene.children.length; i++ ) {
        if ( scene.children[i].material ) {
            scene.children[i].material.opacity = scene.children[i].userData.currentSquare === selectedPiece ? 0.5 : 1.0;
        }
    }
}

function hoverPieces(): void {
    raycaster.setFromCamera( pointer, camera );
    const intersects = raycaster.intersectObjects( scene.children );
    for (let i = 0; i < intersects.length; i++ ) {
        const potentialPiece = intersects[i].object.name;
        const playerTurn = chess.turn();
        if ( potentialPiece && intersects[i].object.userData.color === playerTurn ) {
            intersects[i].object.material.transparent = true;
            intersects[i].object.material.opacity = 0.5;
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

    resetMaterials();
    hoverPieces();
    renderer.render( scene, camera );
    requestAnimationFrame(animate);
}

function resizeRendererToDisplaySize( renderer: THREE.WebGLRenderer ): boolean {
    const canvas = renderer.domElement;
    const pixelRatio: number = window.devicePixelRatio;
    const width: number  = Math.floor( canvas.clientWidth  * pixelRatio );
    const height: number = Math.floor( canvas.clientHeight * pixelRatio );
    const needResize: boolean = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}

function onPointerMove( event ) {

    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components

    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

function onClick( e )  {
    raycaster.setFromCamera( pointer, camera );
    let intersects = raycaster.intersectObjects( scene.children );
    if ( intersects.length > 1 ) {
        if( intersects[0].object.userData.color === chess.turn() ) {
            selectedPiece = intersects[0].object.userData.currentSquare;
            return;
        }
    }

    if ( selectedPiece ) {
        raycaster.setFromCamera( pointer, camera );
        intersects = raycaster.intersectObjects( board.children );

        if ( intersects.length > 0 && intersects[0].object.userData.square ) {
            const targetSquare: Square = intersects[0].object.userData.square;
            const selectedObject = scene.children.find((child) => child.userData.currentSquare === selectedPiece);
            if ( !selectedObject || !targetSquare ) return;

            try{
                if ( !selectedObject.square ) {
                    chess.move( { from: selectedPiece, to: targetSquare } );
                } else {
                    chess.move( { from: selectedObject.square, to: targetSquare } );
                }
                const targetPosition = positionForSquare(targetSquare);
                selectedObject.position.set(targetPosition.x, selectedObject.position.y, targetPosition.z);
                selectedObject.square = targetSquare;

                console.log(chess.ascii());
                if ( chess.turn() === 'w' ) {
                    console.log("It is now white's turn");
                } else if ( chess.turn() === 'b' ) {
                    console.log("It is now black's turn");
                }

                selectedPiece = null;
            } catch (error) {
                // console.log("invalid move");
                console.log(error);
                selectedPiece = null;
            }
        }
    }
}
