import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTF, GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {Chess, Move, Piece, Square} from 'chess.js';
import {Color} from "three";
import {Game, move, status, moves, aiMove, getFen } from 'js-chess-engine';


window.addEventListener('DOMContentLoaded', main);

let renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    board: THREE.Group,
    controls: OrbitControls,
    chess: Chess,
    pointer: THREE.Vector2,
    raycaster: THREE.Raycaster,
    selectedPiece: Square | null = null,
    playerTurn: string = "white",
    previousTurnLandSquare: Square | null = null,
    maxEntropy: THREE.Group<THREE.Object3DEventMap>,
    startGameBtn: HTMLElement | null,
    modalEl: HTMLElement | null,
    playerTurnElement: HTMLElement | null,
    promotionContainer: HTMLElement | null,
    buttons: NodeListOf<HTMLElement>,
    countdownInterval: number,
    otherCountdownInterval: number,
    playerCheckInterval: number,
    countdownEl: HTMLElement | null,
    otherCountdownEl: HTMLElement | null,
    game: Game;


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

    startGameBtn = document.querySelector('#startGameBtn');
    modalEl = document.querySelector('#modalEl');
    playerTurnElement = document.querySelector('#playerTurn');
    promotionContainer = document.getElementById('promotion-container');
    buttons = document.querySelectorAll( '.promotion-buttons button' );
    countdownEl = document.getElementById('clockEl');
    otherCountdownEl = document.getElementById('blackClockEl');

    if (startGameBtn) {
        startGameBtn.addEventListener("click", (): void => {
            init();
            requestAnimationFrame(animate);
            if ( modalEl ) {
                modalEl.style.display = 'none';
            }
        });
    }
    
}

function init(): void {
    chess = new Chess();
    game = new Game();

    // whenever a move is made to chess, apply to game
    /*
    * 1. move to chess, update game [x]
    * 2. make sure to make a move when it is black's turn []
    * 3. update chess game afterwards as well []
     */

    playerTurn = "white";
    playerTurnElement.innerHTML = playerTurn;
    countdownEl.innerHTML = "10:00";
    otherCountdownEl.innerHTML = "10:00";

    const canvas: HTMLElement | null = document.querySelector('#c');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x58595B);
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
    for ( let x: number = 0; x < 8; x++ ) {
        for ( let z: number = 0; z < 8; z++ ) {
            let cube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial, THREE.Object3DEventMap>;
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
        const chessMesh: THREE.Group<THREE.Object3DEventMap> = gltf.scene;
        maxEntropy = chessMesh;
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
}

function positionForSquare( square: string ): THREE.Vector3 {
    const found: THREE.Mesh = board.children.find(( child: THREE.Mesh ): boolean => child.userData.square === square);
    if ( found ) {
        return found.position;
    }
    return null;
}

function knightAddition( piece: THREE.Mesh, pieceOn: Piece, squarePosition: THREE.Mesh, currentSquare: Square ): void {
    const knightMesh: THREE.Mesh = piece.children.find( ( child: THREE.Mesh ): boolean => child.name === "knight");
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
}

function addPieces(pieceMesh: THREE.Group<THREE.Object3DEventMap>): void {
    let boardCubes: THREE.Mesh[] = board.children;
    for (let i: number = 0; i < 64; i++ ) {
        let currentSquare: Square = boardCubes[i].userData.square;
        let pieceOn: Piece = chess.get( currentSquare );
        const piece: THREE.Group<THREE.Object3DEventMap> = pieceMesh.clone(true);
        const squarePosition: THREE.Vector3 = positionForSquare( currentSquare );

        switch ( pieceOn.type ) {
            case 'p':
                addPiece( piece, 0.2, pieceOn, "pawn", squarePosition, currentSquare );
                break;
            case 'r':
                addPiece( piece, 0.15, pieceOn, "rook", squarePosition, currentSquare );
                break;
            case 'n':
                knightAddition( piece, pieceOn, squarePosition, currentSquare );
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
    const mesh: THREE.Mesh = pieces.children.find( ( child: THREE.Mesh): boolean => child.name === `${piece}`);
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

function resetMaterials(): void {
    for ( let i: number = 0; i < scene.children.length; i++ ) {
        if ( scene.children[i].material ) {
            scene.children[i].material.opacity = scene.children[i].userData.currentSquare === selectedPiece ? 0.5 : 1.0;
        }
    }
}

function hoverPieces(): void {
    raycaster.setFromCamera( pointer, camera );
    const intersects: THREE.Raycaster = raycaster.intersectObjects( scene.children );
    for (let i: number = 0; i < intersects.length; i++ ) {
        const potentialPiece = intersects[i].object.name;
        const playerTurn: Color = chess.turn();
        if ( potentialPiece && intersects[i].object.userData.color === playerTurn ) {
            intersects[i].object.material.transparent = true;
            intersects[i].object.material.opacity = 0.5;
        }
    }
}

function moveBlackPiece(): number {
    const move: Object = game.aiMove(0);
    const from: string = Object.keys(move)[0].toLowerCase();
    const to: Square = Object.values(move)[0].toLowerCase();
    const blackMove: Move = chess.move({from: from, to: to});
    // const found: THREE.Mesh = board.children.find(( child: THREE.Mesh ): boolean => child.userData.square === square);
    const meshForThePiece: THREE.Mesh = scene.children.find(( child: THREE.Mesh ): boolean => child.userData.currentSquare === from);
    console.log(meshForThePiece);

    moveMeshDone(to, meshForThePiece);

    return 0;
}

let animationId: number;
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
    animationId = requestAnimationFrame(animate);

    window.addEventListener( 'pointermove', onPointerMove );
    window.addEventListener( 'click', onClick );

    if ( chess.isGameOver() ) {
        gameEnd();
        clearTimer( otherCountdownInterval, otherCountdownEl );
        clearTimer( countdownInterval, countdownEl );
    }
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

function onPointerMove( event: MouseEvent ): void {

    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components

    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

function kingSwitchMagic(mesh: THREE.Mesh, scene: THREE.Scene, move: Move): void {
    const color: string = move.color;
    let square: THREE.Vector3 = positionForSquare('f1');
    switch( color ){
        case 'w':
            mesh = scene.children.find( ( child: THREE.Mesh ): boolean => child.userData.currentSquare === 'h1');
            mesh.position.set(square.x, mesh.position.y, square.z);
            mesh.square = 'f1';
            break;
        case 'b':
            mesh = scene.children.find( ( child: THREE.Mesh ): boolean => child.userData.currentSquare === 'h8');
            square = positionForSquare('f8');
            mesh.position.set(square.x, mesh.position.y, square.z);
            mesh.square = 'f8';
            break;
        default:
            console.log("could not compute");
            break;
    }
}

function queenSwitchMagic(mesh: THREE.Mesh, scene: THREE.Scene, move: Move): void {
    const color: string = move.color;
    let square: THREE.Vector3 = positionForSquare('d1');
    switch( color ){
        case 'w':
            mesh = scene.children.find( ( child: THREE.Mesh ) => child.userData.currentSquare === 'a1');
            mesh.position.set(square.x, mesh.position.y, square.z);
            mesh.square = 'd1';
            break;
        case 'b':
            mesh = scene.children.find( ( child: THREE.Mesh ) => child.userData.currentSquare === 'a8');
            square = positionForSquare('d8');
            mesh.position.set(square.x, mesh.position.y, square.z);
            mesh.square = 'd8';
            break;
        default:
            console.log("could not compute");
            break;
    }
}

function findMesh( targetSquare: Square ): THREE.Mesh {
    let mesh: THREE.Mesh;
    if ( scene.children.find(( child: THREE.Mesh ): boolean => child.square === targetSquare )) {
        mesh = scene.children.find(( child: THREE.Mesh ): boolean => child.square === targetSquare );
    } else {
        mesh = scene.children.find(( child: THREE.Mesh ): boolean => child.userData.currentSquare === targetSquare );
    }

    return mesh;
}

function handleSpecialCases( moveInfo: Move, targetSquare: Square ): void {
    switch ( moveInfo.flags ) {
        case "c":
            let objectToBeCaptured: THREE.Mesh;
            objectToBeCaptured = findMesh( targetSquare );
            scene.remove(objectToBeCaptured);
            break;
        case "k":
            let rookToMove: THREE.Mesh = undefined;
            kingSwitchMagic(rookToMove, scene, moveInfo);
            break;
        case "q":
            let rook: THREE.Mesh = undefined;
            queenSwitchMagic(rook, scene, moveInfo);
            break;
        case "e":
            // find the mesh that let the en passant happen
            let captureMesh: THREE.Mesh = undefined;
            if ( previousTurnLandSquare ) {
                // remove mesh from the scene
                captureMesh = findMesh( previousTurnLandSquare );
                scene.remove(captureMesh);
            }
            break;
        default:
            break;
    }
}

function onClick(): void  {
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
            const selectedObject: THREE.Mesh =
                scene.children.find( ( child: THREE.Mesh ): boolean => child.userData.currentSquare === selectedPiece);
            if ( !selectedObject || !targetSquare ) return;

            let moveInfo: Move;
            try{
                if ( !selectedObject.square ) {
                    // console.log(`${selectedPiece}, ${targetSquare}`);
                    moveInfo = chess.move( { from: selectedPiece, to: targetSquare, promotion: 'q' } );
                    game.move(selectedPiece, targetSquare);
                } else {
                    moveInfo = chess.move( { from: selectedObject.square, to: targetSquare, promotion: 'q' } );
                    game.move(selectedObject.square, targetSquare);
                }

                // check if move is a pawn promotion
                if ( moveInfo.piece === 'p' && ( moveInfo.to[1] === "1" || moveInfo.to[1] === '8')) {
                    chess.undo();
                    showPromotionDialog( moveInfo.from, moveInfo.to, targetSquare, selectedObject );
                    return;
                }

                // handles captured pieces, en passant and castling
                handleSpecialCases( moveInfo, targetSquare );

                moveMeshDone(targetSquare, selectedObject);

                if( chess.turn() === 'b' ) {
                    moveBlackPiece();
                }
                // console.log(chess.turn());
            } catch (error) {
                console.log(error);
                selectedPiece = null;
            }
        }
    }
}

function showPromotionDialog( source: string,
                              target: string, targetSquare: Square, selectedObject: THREE.Mesh ): void {
    promotionContainer.style.display = 'block';
    buttons.forEach(button => {
        button.onclick = (): void => {
            const promotionPiece: string = button.getAttribute('data-piece');
            promotionContainer.style.display = 'none';
            handlePromotionMove( source, target, promotionPiece, targetSquare, selectedObject );
        };
    });
}

function promotionMoveFlags( move: Move, targetSquare: Square ): void {
    switch ( move.flags ) {
        case 'cp':
            let objectToBeCaptured: THREE.Mesh;
            objectToBeCaptured = findMesh( targetSquare );
            scene.remove( objectToBeCaptured );
            break;
        default:
            break;
    }
}

function promotionPieceSelection ( promotionPiece: string,
                                   piece: Piece,
                                   square: THREE.Mesh,
                                   targetSquare: Square ) : void {
    switch ( promotionPiece ) {
        case 'q':
            addPiece(maxEntropy, 0.14, piece, "queen", square, targetSquare );
            break;
        case 'r':
            addPiece(maxEntropy, 0.15, piece, "rook", square, targetSquare );
            break;
        case 'b':
            addPiece( maxEntropy, 0.175, piece, "bishop", square, targetSquare );
            break;
        case 'n':
            knightAddition( maxEntropy, piece, square, targetSquare );
            break;
        default:
            console.log("could not find piece");
            break;
    }
}

function handlePromotionMove( source: string,
                              target: string,
                              promotionPiece: string,
                              targetSquare: Square,
                              selectedObject: THREE.Mesh): void {
    let move: Move;
    try {
        move = chess.move( { from: source, to: target, promotion: promotionPiece } );
        promotionMoveFlags( move, targetSquare );
        moveMeshDone(targetSquare, selectedObject);
        const piece: Piece = chess.get( selectedObject.square );
        const square: THREE.Mesh = positionForSquare( target );
        scene.remove( selectedObject );
        promotionPieceSelection( promotionPiece, piece, square, targetSquare );
    } catch(error) {
        console.log(error);
        return;
    }
}

function moveMeshDone(targetSquare: Square, mesh: THREE.Mesh): void {
    const targetPosition: THREE.Mesh = positionForSquare(targetSquare);
    mesh.position.set(targetPosition.x, mesh.position.y, targetPosition.z);
    mesh.square = targetSquare;
    previousTurnLandSquare = mesh.square;

    switch ( chess.turn() ) {
        case "w":
            playerTurn = 'white';
            break;
        case "b":
            playerTurn = 'black';
            break;
        default:
            console.log("Couldn't find player turn");
            break;
    }
    playerTurnElement.innerHTML = playerTurn;
    selectedPiece = null;
}

document.addEventListener( 'DOMContentLoaded', (): void => {
    const startingMinutes = 10;
    let time: number = startingMinutes * 60 * 1000;
    let otherTime: number = startingMinutes * 60 * 1000;
    let isRunning: boolean;
    let isSecondRunning: boolean;
    const startButton: HTMLElement = document.getElementById("startGameBtn");

    function formatTime( ms: number ): string {
        const totalSeconds: number = Math.floor(ms / 1000);
        const minutes: number = Math.floor(totalSeconds / 60);
        const seconds: number = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function updateCountdown(): void {
        countdownEl.innerHTML = formatTime(time);
        time -= 1000;
        if (time < 0) {
            clearInterval( countdownInterval );
            countdownEl.innerHTML = "Time's up!";
            isRunning = false;
            gameEnd();
        }
    }

    function startCountdown(): void {
        if (isRunning) return;
        time = startingMinutes * 60 * 1000; // reset the time each start
        countdownInterval = setInterval(updateCountdown, 1000);
        isRunning = true;
    }

    function stopCountdown(): void {
        clearInterval(countdownInterval);
        isRunning = false;
    }

    function resumeCountdown(): void {
        if ( isRunning ) return;
        countdownInterval = setInterval(updateCountdown, 1000);
        isRunning = true;
    }

    function updateOtherCountdown(): void {
        otherCountdownEl.innerHTML = formatTime(otherTime);
        otherTime -= 1000;
        if (otherTime < 0) {
            clearInterval( otherCountdownInterval);
            otherCountdownEl.innerHTML = "Time's up!";
            isSecondRunning = false;
            gameEnd();
        }
    }

    function resumeSecondCountdown(): void {
        if ( isSecondRunning ) return;
        otherCountdownInterval = setInterval(updateOtherCountdown, 1000);
        isSecondRunning = true;
    }

    function stopSecondCountdown(): void {
        clearInterval(otherCountdownInterval);
        isSecondRunning = false;
    }

    function playerCheck(): void {
        switch ( playerTurn ) {
            case 'white':
                stopSecondCountdown();
                resumeCountdown();
                break;
            case 'black':
                stopCountdown();
                resumeSecondCountdown();
                break;
            default:
                break;
        }
    }

    startButton.addEventListener("click", (): void => {
        isRunning = false;
        isSecondRunning = false;
        startCountdown();
        playerCheckInterval = setInterval( playerCheck, 500 );
    });
});

function gameEnd(): void {
    cancelAnimationFrame(animationId);
    modalEl.style.display = 'flex';
    window.removeEventListener( 'click', onClick );
    clearInterval(playerCheckInterval);
}

function clearTimer( interval: number, element: HTMLElement ): void {
    clearInterval(interval);
    element.innerHTML = "Time's up!";
}











