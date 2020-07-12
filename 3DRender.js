// import { SubdivisionModifier } from './lib/SubdivisionModifier.js';
import Preset_Indices from "./preset_apply.js"

var scene,      // レンダリングするオブジェクトを入れる
    objmodel,   // モデルデータを入れる
    obj,        // モデルデータの角度などを変更するために重ねる
    decalobj,
    camera,     // カメラのオブジェクト
    light,      // 太陽光のような光源のオブジェクト
    ambient,    // 自然光のような光源のオブジェクト
    axis,       // 補助線のオブジェクト
    renderer,   // 画面表示するためのオブジェクト
    raycaster,
    meshList,
    org_meshList,
    org_matList,
    picker_color,
    decalMaterial,
    decalMeshList,
    body_grad,
    solid_bodymatList,
    isVertGrad;

init();
animate();

function　init (){
    console.log(Preset_Indices.meshIndices);
    const faceIndices = ['a','b','c'];
    body_grad = false;
    isVertGrad = document.getElementById("toggle_vh").checked;
    solid_bodymatList = [];

    scene = new THREE.Scene();      // 表示させるための大元、すべてのデータをこれに入れ込んでいく。
    var prg = document.getElementById("loadprg");
    

    // obj mtl を読み込んでいる時の処理
    var onProgress = function ( xhr ) {
        if ( xhr.lengthComputable ) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log( Math.round(percentComplete, 2) + '% downloaded' );
            prg.value = percentComplete ;
            // prg.style.width = Math.round(percentComplete, 2) + '%';
            if (percentComplete == 100) {
                document.getElementById("loadprg").remove();
            }
            }
    };

    // obj mtl が読み込めなかったときのエラー処理
    var onError = function ( xhr ) {  console.log("FBX load failed.")  };

    // obj mtlの読み込み
    // var ObjLoader = new THREE.OBJLoader();
    var ObjLoader = new THREE.FBXLoader();
    meshList = [];
    org_meshList = [];
    org_matList=[];
    const gradTex = createGradTex();
    decalMaterial = new THREE.MeshPhongMaterial( {  
        // transparent: true, 
        // depthTest: true,   
        // depthWrite: false,   
        // polygonOffset: true,  
        // polygonOffsetFactor: -4, 
        map : gradTex,
        shininess:70,
    });

    ObjLoader.load("OS-11_Final_Assy2.fbx",  function (object){
        // console.table(meshList);
        objmodel = object.clone();
        objmodel.scale.set(0.4, 0.4, 0.4);            // 縮尺の初期化
        objmodel.rotation.set(-1*Math.PI/2, 0, 0);         // 角度の初期化
        objmodel.position.set(0, 0, -100);         // 位置の初期化

        decalMeshList = [];
        objmodel.traverse(function(child){
            if(child.isMesh){
                meshList.push(child);
                org_meshList.push(child);
                org_matList.push(new THREE.MeshStandardMaterial(
                    {roughness:0.4, color:child.material.color,
                     opacity:1, transparent:true
                     }));
            }
        });

        meshList.map((mesh, index)=>{
            mesh.material = new THREE.MeshStandardMaterial(
                {roughness:0.4, color:org_matList[index].color,
                    opacity:1, transparent:true
                    });
            if(isBody(index)){
                solid_bodymatList.push(mesh.material);
                mesh.geometry.computeBoundingBox();
                var tempgeom = new THREE.Geometry();
                var tempmesh = new THREE.Mesh(tempgeom.fromBufferGeometry(mesh.geometry), new THREE.MeshStandardMaterial());
                tempgeom.computeBoundingBox();
                var tempbb =  getBoxGeometryFromBoundingBox(tempmesh.geometry.boundingBox);
                var decalGeometry = new THREE.DecalGeometry(  
                    tempmesh, // it has to be a THREE.Mesh
                    tempbb.pos,
                    new THREE.Vector3(0,0,0), // THREE.Vector3 specifying the orientation of the decal  
                    tempbb.length, // THREE.Vector3 specifying the size of the decal box  
                    1 // THREE.Vector3 specifying what sides to clip (1-clip, 0-noclip)  
                );
                decalGeometry.scale(4,4,4);
                decalGeometry.rotateX(-1*Math.PI/2);
                decalGeometry.translate(0,0,-100);
                var decalMesh = new THREE.Mesh(decalGeometry,decalMaterial);
                decalMeshList.push(decalMesh);
            }
        });

    // objをObject3Dで包む
        obj = new THREE.Object3D();
        decalobj = new THREE.Object3D();
        obj.add(objmodel);
        decalMeshList.map(mesh=>{
            decalobj.add(mesh);
        });
        scene.add(obj);
        lightFadeIn();
    }, onProgress, onError);        // obj mtl データは(.obj, .mtl. 初期処理, 読み込み時の処理, エラー処理)
                                    // と指定する。

    // light2 = new THREE.DirectionalLight(0xdedede, 0.5);
    const light2 = new THREE.SpotLight(0xffffff,0, 1000, Math.PI/2, 1, 0.5);
    light2.position.set(0, 300, -50);
    light2.castShadow = true;
    scene.add(light2);
    
    // ambient = new THREE.AmbientLight(0xededed,0.7);
    const ambient = new THREE.HemisphereLight(0xffffff,0xaaaaaa,0.5);
    scene.add(ambient);
    function lightFadeIn(){
        var tween1 = new createjs.Tween.get(light2)
                .to({power:Math.PI},2000,createjs.Ease.cubicInOut);
        var tween2 = new createjs.Tween.get(ambient)
                .to({power:0.5*Math.PI},2000,createjs.Ease.cubicInOut);
    };

    //camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 5000);
    camera.position.set(300, 300, 300);

    // hepler
    axis = new THREE.AxisHelper(2000);  // 補助線を2000px分表示
    axis.position.set(0,-1,0);          // 零戦の真ん中に合わせるため、少しずらす
    scene.add(axis);

    var loader = new THREE.FontLoader();
    loader.load( 'helvetiker_regular.typeface.json', function ( font ) {
            var xMid, text;
            var color = new THREE.Color( 0x006699 );
            var matDark = new THREE.MeshBasicMaterial( {
                color: color,
                side: THREE.DoubleSide
            } );
            var matLite = new THREE.MeshBasicMaterial( {
                color: color,
                transparent: true,
                opacity: 0.4,
                side: THREE.DoubleSide
            } );
        var message = " OS-11 ";
        var shapes = font.generateShapes( message, 100 );
        var geometry = new THREE.ShapeBufferGeometry( shapes );
        geometry.computeBoundingBox();
        xMid = - 0.5 * ( geometry.boundingBox.max.x - geometry.boundingBox.min.x );
        geometry.translate( xMid, 0, 0 );
        // make shape ( N.B. edge view not visible )
        text = new THREE.Mesh( geometry, matLite );
        text.position.y = - 100;
        text.rotation.x = -Math.PI/2;
        // scene.add( text );
    });

    // 画面表示
    renderer = new THREE.WebGLRenderer({antialias : true, alpha : true});
    renderer.setSize(window.innerWidth, window.innerHeight);        // 画面の大きさを設定
    renderer.setClearColor(0x000000, 0.7);    
    renderer.shadowMapEnabled = true;       
    // html の container というid に追加
    document.getElementById('container').appendChild(renderer.domElement);

    window.addEventListener('resize', onResize);

    function onResize() {
    // サイズを取得
    const width = window.innerWidth;
    const height = window.innerHeight;

    // レンダラーのサイズを調整する
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);

    // カメラのアスペクト比を正す
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    }

    let controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.screenSpacePanning = true;

    // マウス座標管理用のベクトルを作成
    var mouse = new THREE.Vector2();
    raycaster = new THREE.Raycaster();
    picker_color = convertHexFormat(document.getElementById("cl_1").value);

    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    // マウスを動かしたときのイベント
    function handleMouseMove(event) {
        const element = event.currentTarget;
        // canvas要素上のXY座標
        const x = event.clientX - element.offsetLeft;
        const y = event.clientY - element.offsetTop;
        // canvas要素の幅・高さ
        const w = element.offsetWidth;
        const h = element.offsetHeight;

        // -1〜+1の範囲で現在のマウス座標を登録する
        mouse.x = (x / w) * 2 - 1;
        mouse.y = -(y / h) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(meshList);
        // const intersects = getMouseIntersects(event);
        meshList.map((mesh,index) => {
            // 交差しているオブジェクトが1つ以上存在し、
            // 交差しているオブジェクトの1番目(最前面)のものだったら
            if (intersects.length > 0 && mesh === intersects[0].object) {
                picker_color = convertHexFormat(document.getElementById("cl_3").value);
                mesh.material.color.setHex(picker_color);
            }
            else {
                // それ以外は元の色にする
                var org_color=org_matList[index].color;
                mesh.material.color.setRGB(org_color.r, org_color.g, org_color.b);
            }
        });
    }

    renderer.domElement.addEventListener('dblclick', handleMouseClick);

    function handleMouseClick(event){
        const element = event.currentTarget;
        // canvas要素上のXY座標
        const x = event.clientX - element.offsetLeft;
        const y = event.clientY - element.offsetTop;
        // canvas要素の幅・高さ
        const w = element.offsetWidth;
        const h = element.offsetHeight;

        // -1〜+1の範囲で現在のマウス座標を登録する
        mouse.x = (x / w) * 2 - 1;
        mouse.y = -(y / h) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(meshList);
        // const intersects = getMouseIntersects(event);
        meshList.map(mesh => {
            if (intersects.length > 0 && mesh === intersects[0].object) {
            picker_color = convertHexFormat(document.getElementById("cl_3").value);
            var index = getOriginalMesh(mesh);
            // mesh.material.color.setHex(picker_color);
            org_matList[index].color.setHex(picker_color);
            console.log("color changed; mesh index : %i",index);
            }
        });
    }

    document.getElementById("cl_1").addEventListener("input",onColorChange);
    document.getElementById("cl_2").addEventListener("input",onColorChange);
    
    function onColorChange(){
        //Gradation
        const tex = createGradTex();
        decalMaterial.map = tex;

        //Solid
        var targetIndex = [29, 30, 31];//Index of 'meshList' array representing guitar's body
        const targetcolor = document.getElementById("cl_1").value.replace("#","0x");
        targetIndex.map(index=>{
            org_matList[index].color.setHex(targetcolor);  //change color immediately
        });
        renderer.domElement.dispatchEvent(new Event("mousemove"));//Force to update
    }

    document.getElementById("RandomizeBodyColor").onclick=function(){
        var targetIndex = [29, 30, 31];//Index of 'meshList' array representing guitar's body
        var rnd_color=getRandomHex();//returns object including hex string, r, g, b(0~1)
        var rnd_color2=getRandomHex();//returns object including hex string, r, g, b(0~1)

        document.getElementById("cl_1").value = rnd_color.str.replace("0x","#");
        document.getElementById("cl_2").value = rnd_color2.str.replace("0x","#");
        onColorChange();
        renderer.domElement.dispatchEvent(new Event("mousemove"));//Force to update
    }

    // document.getElementById("ToggleColorType").onclick=function(){
    document.getElementById("toggle_vh_container").onclick=function(){
        // if(body_grad){
        if(!document.getElementById("toggle_sg").checked){
            //Solid Color
            body_grad = false;
            // decalMeshList.map(mesh=>{
                scene.remove(decalobj);
            // });
            solid_bodymatList.map(material=>{
                material.opacity = 1;
                material.transparent = false;
            });
            onColorChange();
        }
        else{
            //Gradation
            body_grad = true;
            scene.add(decalobj);
            onColorChange();
            solid_bodymatList.map(material=>{
                material.opacity = 0;
                material.transparent = true;
            });
        }
    }

    document.getElementById("toggle_vh").onchange=function(){
        isVertGrad = document.getElementById("toggle_vh").checked;
        // createGradTex();
        onColorChange();
    }

    var preset_list = Array.from(document.getElementsByClassName("preset_item"));
    preset_list.map(el=>{
        el.addEventListener("click",SetPresetColor);
    });

    function getMouseIntersects(event){
        const element = event.currentTarget;
        // canvas要素上のXY座標
        const x = event.clientX - element.offsetLeft;
        const y = event.clientY - element.offsetTop;
        // canvas要素の幅・高さ
        const w = element.offsetWidth;
        const h = element.offsetHeight;

        // -1〜+1の範囲で現在のマウス座標を登録する
        mouse.x = (x / w) * 2 - 1;
        mouse.y = -(y / h) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(meshList);
        return intersects;
    }

}   

// 値を変更させる処理
function animate() {
    requestAnimationFrame(animate);     // フレームと再描画を制御してくれる関数。
                                        // そのブラウザのタブが非表示のとき、描画頻度が自動で低下するので、
                                        // メモリの消費を抑えることができる。
    // cameramove();   // カメラ移動
    render();       // 再描画処理
    // TWEEN.update();
}

function render() {
    renderer.render(scene, camera); // 再描画
}

function getOriginalMesh(mesh){
    var index;
    // org_meshList.map(buf=>{
    //     if(buf===mesh){
    //         index = org_meshList.indexOf(buf);
    //         return index;
    //     }
    // });
    index = meshList.indexOf(mesh);
    return index;
}

function convertHexFormat(string){
    //#rrggbb -> 0xrrggbb
    return string.replace("#","0x");
}

function getRandomHex(){
    var ret = {str : "",r:0,g:0,b:0};
    ret.str = '0x'+ ("000000"+Math.floor(Math.random()*16777215).toString(16)).slice(-6);
    ret.r = parseInt(ret.str.slice(2,4),16)/256;
    ret.g = parseInt(ret.str.slice(4,6),16)/256;
    ret.b = parseInt(ret.str.slice(6),16)/256;
    return ret;
}

function createGradTex(){
    var canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    var context = canvas.getContext('2d');
    context.beginPath();
    var grad;
    if(isVertGrad){
      grad = context.createLinearGradient(0, 0, 0, 64);
    }
    else{
        grad = context.createLinearGradient(0, 0, 64, 0);
    }
     
    var cv_1 = document.getElementById("cl_1").value;
    var cv_2 = document.getElementById("cl_2").value;
    grad.addColorStop(0.15,cv_1);
    grad.addColorStop(1,cv_2);
    context.fillStyle = grad;
    context.rect(0, 0, 64, 64);
    context.fill();
    // geometry = new THREE.PlaneGeometry(70, 70, 8, 8);
    const texture = new THREE.CanvasTexture(canvas,THREE.UVMapping);
    return texture;
}

function isBody(index){
    var ret = false;
    if(index == 29 || index==30 || index ==31){
        ret = true;
    }
    return ret;
}

function getBoxGeometryFromBoundingBox(bb){
    var ret={pos:new THREE.Vector3(0.0, 0.0, 0.0),
             length : new THREE.Vector3(0.0, 0.0, 0.0)};
    ret.pos.addVectors(bb.max, bb.min);
    ret.pos.divideScalar(2.0);
    
    ret.length.subVectors(bb.max, bb.min);

    return ret;

}

function SetPresetColor(el){
    // console.log(el);
    const cl=Array.from(el.target.classList);
    // const RGBstr = el.target.style.backgroundColor.match(/\d+/g);
    const RGBstr = el.target.style.backgroundColor
    cl.map(c=>{
        if(Preset_Indices.meshIndices[c]){
            // console.log(Preset_Indices.meshIndices[c]);
            Preset_Indices.meshIndices[c].map(index=>{
                // org_matList[index].color.setHex(picker_color);
                org_matList[index].color.set(RGBstr);
            });
        }
    });
    renderer.domElement.dispatchEvent(new Event("mousemove"));//Force to update
}

// function toggleUI(){
//     if(document.getElementById("showUI").classList.include("shown")){
//         document.getElementById("showUI").classList.remove("shown");
//         document.getElementById("cl_container").classList.remove("hidden");
//     }
//     else{
//         document.getElementById("showUI").classList.add("shown");
//         document.getElementById("cl_container").classList.add("hidden");
//     }
// }
