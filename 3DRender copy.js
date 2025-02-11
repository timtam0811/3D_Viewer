var scene,      // レンダリングするオブジェクトを入れる
    objmodel,   // モデルデータを入れる
    obj,        // モデルデータの角度などを変更するために重ねる
    camera,     // カメラのオブジェクト
    light,      // 太陽光のような光源のオブジェクト
    ambient,    // 自然光のような光源のオブジェクト
    axis,       // 補助線のオブジェクト
    renderer,   // 画面表示するためのオブジェクト
    raycaster,
    meshList,
    org_meshList,
    org_matList,
    picker_color;

init();
animate();

function　init (){

    var width  = 1000,  // 表示サイズ 横
        height = 600;   // 表示サイズ 縦

    Radius = 500;       // カメラの半径;
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
    var onError = function ( xhr ) {    };

    // obj mtlの読み込み
    // var ObjLoader = new THREE.OBJLoader();
    var ObjLoader = new THREE.FBXLoader();
    meshList = [];
    org_meshList = [];
    org_matList=[];
    ObjLoader.load("OS-11_Final_Assy2.fbx",  function (object){
        // console.table(meshList);
        objmodel = object.clone();
        objmodel.scale.set(0.4, 0.4, 0.4);            // 縮尺の初期化
        objmodel.rotation.set(-1*Math.PI/2, 0, 0);         // 角度の初期化
        objmodel.position.set(0, 0, -100);         // 位置の初期化
        const maptex = createGradTex();
        const projectMat = new THREE.ShaderMaterial({
            uniforms: { "texture":  maptex},
            vertexShader:  `
            varying vec4 vWorldPos;
            varying vec4 vColor;
            attribute vec3 color;
            void main() {
                vWorldPos = modelMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * viewMatrix * vWorldPos;
                if(vWorldPos.z > 0.0){
                    float val = min(1.0, vWorldPos.z/200.0);
                    vColor =vec4(val, val, val, 1.0);
                }
                else{
                    float val = max(0.0, vWorldPos.z/200.0);
                    vColor=vec4(val, val, val, 1.0);
                }
            }
             `,
            fragmentShader: `
            varying vec4 vColor;
            void main(void)
            {
                gl_FragColor = vColor;
            }
            `,
          });
        objmodel.traverse(function(child){
            if(child.isMesh){
                // child.material = new THREE.MeshLambertMaterial(
                // child.material = new THREE.MeshStandardMaterial(
                //    {roughness:0.4, 
                //     opacity:1, transparent:true,map:maptex
                //     } 
                // );
                child.material = projectMat;
                meshList.push(child);
                org_meshList.push(child);
                // org_matList.push(new THREE.MeshLambertMaterial(
                // org_matList.push(new THREE.MeshStandardMaterial(
                //     {color : child.material.color, roughness:0.4} 
                //  ));
                // org_matList.push(new THREE.MeshStandardMaterial(
                //     {roughness:0.4, 
                //      opacity:1, transparent:true,map:maptex
                //      }));
                org_matList.push(projectMat);
            }
        });

    // objをObject3Dで包む
        obj = new THREE.Object3D();
        obj.add(objmodel);
        scene.add(obj);
        // modelFadeIn();                     // sceneに追加
        lightFadeIn();
    }, onProgress, onError);        // obj mtl データは(.obj, .mtl. 初期処理, 読み込み時の処理, エラー処理)
                                    // と指定する。

    function modelFadeIn(){
        meshList.map(mesh=>{
            // var targetAlpha = 0;
            var tween = new createjs.Tween.get(mesh.material)
                .to({opacity:1},2000,createjs.Ease.cubicInOut);
                // .addEventListener("change",function(){
                // mesh.material.opacity = targetAlpha;
                // });
        });
    }

    const ballgeom = new THREE.SphereGeometry(10,32,32);
    const ballmat = new THREE.MeshBasicMaterial( {color: 0x0f00ff} );
    var sphere = new THREE.Mesh(ballgeom, ballmat);
    sphere.position.set(0,100,100);
    // scene.add( sphere );

    //light
    light1 = new THREE.DirectionalLight(0xffeebb, 0.8);
    light1.position.set(0, 100, 100);
    light1.castShadow = true;
    // scene.add(light1);

    // light2 = new THREE.DirectionalLight(0xdedede, 0.5);
    light2 = new THREE.SpotLight(0xffffff,0, 1000, Math.PI/2, 1, 0.7);
    light2.position.set(0, 300, -50);
    light2.castShadow = true;
    scene.add(light2);
    
    // ambient = new THREE.AmbientLight(0xededed,0.7);
    ambient = new THREE.HemisphereLight(0xffffff,0xaaaaaa,0.5);
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
    //camera.position.x = 0;
    //camera.position = new THREE.Vectror3(0,0,0); のような書き方もある

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

    // renderer.domElement.addEventListener('mousemove', handleMouseMove);
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
        meshList.map(mesh => {
            // 交差しているオブジェクトが1つ以上存在し、
            // 交差しているオブジェクトの1番目(最前面)のものだったら
            if (intersects.length > 0 && mesh === intersects[0].object) {
            // 色を赤くする
            // mesh.material.color.setHex(0xff0000);
            picker_color = convertHexFormat(document.getElementById("cl_1").value);
            mesh.material.color.setHex(picker_color);
            } else {
            // それ以外は元の色にする
            var index = getOriginalMesh(mesh);
            var org_mesh = org_meshList[index];
            org_color=org_matList[index].color;
            mesh.material.color.setRGB(org_color.r,org_color.g,org_color.b);
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
            picker_color = convertHexFormat(document.getElementById("cl_1").value);
            var index = getOriginalMesh(mesh);
            // mesh.material.color.setHex(picker_color);
            org_matList[index].color.setHex(picker_color);
            console.log("color changed; mesh index : %i",index);
            }
        });
    }

    document.getElementById("RandomizeBodyColor").onclick=function(){
        var targetIndex = [29, 30, 31];//Index of 'meshList' array representing guitar's body
        var rnd_color=getRandomHex();//returns object including hex string, r, g, b(0~1)
        var target={r : rnd_color.r, g : rnd_color.g, b : rnd_color.b};
        targetIndex.map(index=>{
            // org_matList[index].color.setHex(rnd_color.str);  //change color immediately
            
            ////Animated color change
            var test = {r:org_matList[index].color.r, 
                        g:org_matList[index].color.g,
                        b:org_matList[index].color.b};
            var tween = new createjs.Tween.get(test)
                .to({r:target.r, g:target.g, b:target.b},800,createjs.Ease.cubicOut)
                .addEventListener("change",function(){
                org_matList[index].color.r = test.r;
                org_matList[index].color.g = test.g;
                org_matList[index].color.b = test.b;
                meshList[index].material.color.r = test.r;
                meshList[index].material.color.g = test.g;
                meshList[index].material.color.b = test.b;
                });
                
        });
        console.log("random color set;%s",rnd_color.str);
        document.getElementById("cl_1").value=rnd_color.str.replace("0x","#");
    }

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
    canvas.width = 100;
    canvas.height = 100;
    var context = canvas.getContext('2d');
    context.beginPath();
    var grad = context.createLinearGradient(0, 0, 0, 100);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(255,255,255,1)');
    context.fillStyle = grad;
    context.rect(0, 0, 100, 100);
    context.fill();
    // geometry = new THREE.PlaneGeometry(70, 70, 8, 8);
    texture = new THREE.CanvasTexture(canvas,THREE.EquirectangularRefractionMapping);
    return texture;
}