/**   _   _____ _   _   
*    | | |_   _| |_| |
*    | |_ _| | |  _  |
*    |___|_|_| |_| |_|
*    @author l.th / http://lo-th.github.io/labs/
*/

V.Terrain = function(Parent, obj){
    this.main = Parent;
    this.debug = true;

    obj = obj || {};

    this.div = obj.div || [256,256];
    //this.div = obj.div || [512,512];
    this.size = obj.size || [50, 10, 50];
    //this.size = obj.size || [256, 30, 256];
    this.isAutoMove = obj.AutoMove || false;
    this.isMove = obj.Move || false;

    this.ratio = 0;
    this.hfFloatBuffer = null;


    this.mapOffset = 20;
    
    //this.colors = [0x505050, 0x707050, 0x909050, 0xAAAA50, 0xFFFF50];

    //this.bumpTexture = new THREE.Texture();

    this.heightMap = null;
    this.normalMap = null;
    this.specularMap = null;

    this.mlib = {};
    this.textureCounter=0;

    this.sceneRenderTarget = null;
    this.cameraOrtho = null;

    
    
    this.W = 0;
    this.H = 0;

    this.quadTarget = null;

    this.animDelta = 0;
    this.animDeltaDir = -1;
    this.lightVal = 0;
    this.lightDir = 1;
    this.pos = {x:0, y:0};
    this.ease = {x:0, y:0};

    this.maxspeed = 2;
    this.acc = 0.1;
    this.dec = 0.1;

    this.updateNoise = true;

    this.noiseShader = null;
    this.normalShader = null;
    this.specularShader = null;
    this.terrainShader = null;

    this.tmpData = null;

    this.isWithDepthTest = true;

    this.textures = [];
    this.maps = ['level0', 'level1', 'level2', 'level3', 'level4', 'diffuse1', 'diffuse2', 'normal']

    this.fullLoaded = false;
    this.timerTest = null;

    this.end = null;

    this.init();

}

V.Terrain.prototype = {
    constructor: V.Terrain,
    load:function(endFunction){
        this.end = endFunction;
        var PATH = 'images/terrain/';
        var i = this.maps.length;
        while(i--){
            this.textures[i] = new THREE.ImageUtils.loadTexture( PATH + this.maps[i]+ '.jpg' );
        }
        this.timerTest = setInterval(function(){ this.testTextures(); }.bind(this), 20);
    },
    testTextures:function () {
        if ( this.textures.length == this.maps.length)  {
            clearInterval(this.timerTest);
            var i = this.textures.length;
            while(i--){
                this.textures[i].format = THREE.RGBFormat;
                this.textures[i].wrapS = this.textures[i].wrapT = THREE.RepeatWrapping;
            }
            this.start();
        }
    },
    clear:function () {
        this.container.remove(this.mesh);
        //this.mesh.material.dispose();
        this.mesh.geometry.dispose();

        this.mlib[ 'heightmap' ].dispose();
        this.mlib[ 'normal' ].dispose();
        this.mlib[ 'terrain' ].dispose();
    },
    init:function () {

        this.ratio = this.size[1]/765;
        this.hfFloatBuffer = new Float32Array(this.div[0]*this.div[1]);
            
        var geo = new THREE.PlaneBufferGeometry(this.size[0], this.size[2], this.div[0]-1, this.div[1]-1);

        this.mesh = new THREE.Mesh( geo, new THREE.MeshBasicMaterial( { color:0xFF5555 } ) );
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.geometry.computeTangents()
        this.mesh.visible = false;

        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        this.container = new THREE.Group();
        this.container.add(this.mesh);

        this.main.scene.add(this.container);

        this.W = this.main.dimentions.w || 512;
        this.H = this.main.dimentions.h || 512;

       // this.start();
        this.load();

        if(this.debug){
            var geod = new THREE.PlaneBufferGeometry(this.size[0]*0.25, this.size[2]*0.25);
            this.m1 = new THREE.Mesh( geod, new THREE.MeshBasicMaterial( { color:0xFFFFFF } ) );
            this.m2 = new THREE.Mesh( geod, new THREE.MeshBasicMaterial( { color:0xFFFFFF } ) );
            this.m3 = new THREE.Mesh( geod, new THREE.MeshBasicMaterial( { color:0xFFFFFF } ) );
            this.container.add(this.m1);
            this.container.add(this.m2);
            this.container.add(this.m3);
            this.m2.position.set(0,0,this.size[0]*0.75);
            this.m1.position.set(-this.size[0]*0.25,0,this.size[0]*0.75);
            this.m3.position.set(this.size[0]*0.25,0,this.size[0]*0.75);
            this.m1.rotation.x = -Math.PI / 4;
            this.m2.rotation.x = -Math.PI / 4;
            this.m3.rotation.x = -Math.PI / 4;
            this.m1.visible = false;
            this.m2.visible = false;
            this.m3.visible = false;
        }

    },
    
    start:function() {

        if(this.isWithDepthTest){
            var size = this.div[0] * this.div[1];
            this.tmpData  = new Uint8Array(size*4);
        }

        this.sceneRenderTarget = new THREE.Scene();

        this.cameraOrtho = new THREE.OrthographicCamera( this.W / - 2, this.W / 2, this.H / 2, this.H / - 2, -10000, 10000 );
        this.cameraOrtho.position.z = 100;
        this.sceneRenderTarget.add( this.cameraOrtho );

        // NORMAL MAPS

        this.normalShader = V.TerrainNormal;

        //var pars = { minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };
        var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };

        this.heightMap = new THREE.WebGLRenderTarget( this.div[0], this.div[1], pars );
        this.normalMap = new THREE.WebGLRenderTarget( this.div[0], this.div[1], pars );
        this.specularMap = new THREE.WebGLRenderTarget( this.div[0], this.div[1], pars );

    
        //this.normalShader.uniforms = THREE.UniformsUtils.clone( this.normalShader.uniforms );

        this.normalShader.uniforms.height.value = 0.05;
        this.normalShader.uniforms.resolution.value.set(this.div[0], this.div[1]);
        this.normalShader.uniforms.scale.value.set( 1,1 );
        this.normalShader.uniforms.heightMap.value = this.heightMap;

        // NOISE
        this.noiseShader = V.TerrainNoise;


        //this.specularMap = new THREE.WebGLRenderTarget( 512, 512, pars );
        //this.specularMap = new THREE.WebGLRenderTarget( 1024, 1024, pars );

        this.specularShader = V.TerrainLuminosity;

        this.specularShader.uniforms.tDiffuse.value = this.normalMap;

        //this.applyShader();

        // TERRAIN SHADER

        this.terrainShader = V.TerrainShader;

        //this.terrainShader.uniforms[ 'combine' ].value = THREE.MixOperation;
        this.terrainShader.uniforms[ 'env' ].value = this.main.environment;//THREE.ImageUtils.loadTexture( './images/spherical/e_chrome.jpg');
        //this.terrainShader.uniforms[ 'tCube' ].value = this.main.sky;
        this.terrainShader.uniforms[ 'reflectivity' ].value = 0.6;
        this.terrainShader.uniforms[ 'enableReflection' ].value = true;

        this.terrainShader.uniforms[ 'oceanTexture' ].value = this.textures[0];
        this.terrainShader.uniforms[ 'sandyTexture' ].value = this.textures[1];
        this.terrainShader.uniforms[ 'grassTexture' ].value = this.textures[2];
        this.terrainShader.uniforms[ 'rockyTexture' ].value = this.textures[3];
        this.terrainShader.uniforms[ 'snowyTexture' ].value = this.textures[4];

        this.terrainShader.uniforms[ 'tNormal' ].value = this.normalMap;
        this.terrainShader.uniforms[ 'uNormalScale' ].value = 3.5;

        this.terrainShader.uniforms[ 'tDisplacement' ].value = this.heightMap;



        this.terrainShader.uniforms[ 'tDiffuse1' ].value = this.textures[5];
        this.terrainShader.uniforms[ 'tDiffuse2' ].value = this.textures[6];
        this.terrainShader.uniforms[ 'tSpecular' ].value = this.specularMap;
        this.terrainShader.uniforms[ 'tDetail' ].value = this.textures[7];

        this.terrainShader.uniforms[ 'enableDiffuse1' ].value = true;
        this.terrainShader.uniforms[ 'enableDiffuse2' ].value = true;
        this.terrainShader.uniforms[ 'enableSpecular' ].value = true;

        this.terrainShader.uniforms[ 'diffuse' ].value.setHex( 0x303030 );
        this.terrainShader.uniforms[ 'specular' ].value.setHex( 0x111111 );
        this.terrainShader.uniforms[ 'ambient' ].value.setHex( 0x101010 );

        this.terrainShader.uniforms[ 'shininess' ].value = 20;

        this.terrainShader.uniforms[ 'uDisplacementScale' ].value = this.size[1];
        this.terrainShader.uniforms[ 'uRepeatOverlay' ].value.set( 12, 12 );

         if(this.debug){
            this.m1.material.map = this.heightMap;
            this.m2.material.map = this.normalMap;
            this.m3.material.map = this.specularMap;
            this.m1.material.needsUpdate = true;
            this.m2.material.needsUpdate = true;
            this.m3.material.needsUpdate = true;
            this.m1.visible = true;
            this.m2.visible = true;
            this.m3.visible = true;
         }

        var params = [
            [ 'heightmap',  this.noiseShader.fs, this.noiseShader.vs, this.noiseShader.uniforms, false ],
            [ 'normal',     this.normalShader.fs,  this.normalShader.vs, this.normalShader.uniforms, false ],
            [ 'specular',   this.specularShader.fs,  this.specularShader.vs, this.specularShader.uniforms, false ],
            [ 'terrain',    this.terrainShader.fs, this.terrainShader.vs, this.terrainShader.uniforms, true ]
        ];

        var material;
        var i = params.length;
        while(i--){
            material = new THREE.ShaderMaterial( {
                uniforms:       params[ i ][ 3 ],
                vertexShader:   params[ i ][ 2 ],
                fragmentShader: params[ i ][ 1 ],
                lights:         false,
                fog:            false,
                } );
            this.mlib[ params[ i ][ 0 ] ] = material;
        }

        this.mlib.terrain.transparent = true;


        var plane = new THREE.PlaneBufferGeometry( this.W, this.H );

        this.quadTarget = new THREE.Mesh( plane, new THREE.MeshBasicMaterial( { color: 0x000000 } ) );
        this.quadTarget.position.z = -500;
        this.sceneRenderTarget.add( this.quadTarget );

        this.mlib.terrain.isActive = true;
        this.mesh.material = this.mlib.terrain;
        this.mesh.visible = true;

        //if(env) env.add(terrain.mlib.terrain);

        this.fullLoaded = true;
        this.update(1);

    },
    /*generateData : function (width, height, color) {
        var size = width * height;
        
        var data = new Uint8Array(size*4);

        var r = Math.floor(color.r * 255);
        var g = Math.floor(color.g * 255);
        var b = Math.floor(color.b * 255);

        for (var i = 0; i < size; i++) {
            if (i == size / 2 + width / 2) {
                data[i * 4] = 255;
                data[i * 4 + 1] = g;
                data[i * 4 + 2] = b;
                data[i * 4 + 3] = 255;
            } else {
                data[i * 4] = r;
                data[i * 4 + 1] = g;
                data[i * 4 + 2] = b;
                data[i * 4 + 3] = 255;
            }
        }
        this.tmpData = data;
    },*/
    easing:function(){
        var key = this.main.nav.key;
        var delta = this.main.clock.getDelta();
        //var r = this.main.nav.cam.horizontal * (Math.PI / 180);
        var r = this.main.nav.cam.theta;

        if(key.shift)this.maxspeed=5;
        else this.maxspeed=1;

        //acceleration
        if (key.up) this.ease.y -= this.acc;
        if (key.down) this.ease.y += this.acc;
        if (key.left) this.ease.x -= this.acc;
        if (key.right) this.ease.x += this.acc;
        //speed limite
        if (this.ease.x > this.maxspeed) this.ease.x = this.maxspeed;
        if (this.ease.y > this.maxspeed) this.ease.y = this.maxspeed;
        if (this.ease.x < -this.maxspeed) this.ease.x = -this.maxspeed;
        if (this.ease.y < -this.maxspeed) this.ease.y = -this.maxspeed;
        //break
        if (!key.up && !key.down) {
            if (this.ease.y > this.dec) this.ease.y -= this.dec;
            else if (this.ease.y < -this.dec) this.ease.y += this.dec;
            else this.ease.y = 0;
        }
        if (!key.left && !key.right) {
            if (this.ease.x > this.dec) this.ease.x -= this.dec;
            else if (this.ease.x < -this.dec) this.ease.x += this.dec;
            else this.ease.x = 0;
        }

        if (this.ease.x == 0 && this.ease.z == 0) return;

        this.pos.x += (Math.sin(r) * this.ease.x + Math.cos(r) * this.ease.y)*0.01;
        this.pos.y += (Math.cos(r) * this.ease.x - Math.sin(r) * this.ease.y)*0.01;

        this.update(delta);
    },
    move:function(x,y,delta){
        this.pos.x=x;
        this.pos.y=y;
        this.update(delta);
    },
    update:function (delta) {
        if ( this.fullLoaded ) {

            var time = Date.now() * 0.001;

            var fLow = 0.01, fHigh = 0.8;

            this.lightVal = THREE.Math.clamp( this.lightVal + 0.5 * delta * this.lightDir, fLow, fHigh );

            var valNorm = ( this.lightVal - fLow ) / ( fHigh - fLow );

            this.terrainShader.uniforms[ 'uNormalScale' ].value = THREE.Math.mapLinear( valNorm, 0, 1, 0.6, 3.5 );

            if (  this.updateNoise ) {

                this.animDelta = THREE.Math.clamp( this.animDelta + 0.00075 * this.animDeltaDir, 0, 0.05 );
                this.noiseShader.uniforms[ 'time' ].value += delta * this.animDelta;
                this.noiseShader.uniforms[ 'offset' ].value.set(this.pos.x, this.pos.y);

                this.terrainShader.uniforms[ 'uOffset' ].value.set(8*this.pos.x, 8*this.pos.y);

                this.quadTarget.material =  this.mlib.heightmap;
                this.main.renderer.render( this.sceneRenderTarget, this.cameraOrtho, this.heightMap, true );

                if(this.isWithDepthTest){
                    var gl = this.main.renderer.getContext();
                    gl.readPixels( 0, 0, this.div[0], this.div[1], gl.RGBA, gl.UNSIGNED_BYTE, this.tmpData );
                }

                this.quadTarget.material =  this.mlib.normal;
                this.main.renderer.render( this.sceneRenderTarget, this.cameraOrtho, this.normalMap, true );

                this.quadTarget.material =  this.mlib.specular;
                this.main.renderer.render( this.sceneRenderTarget, this.cameraOrtho, this.specularMap, true );

               // this.generatePhysicsData();
            }
        }

    },
    anim:function () {
        this.animDeltaDir *= -1;
    },
    night:function () {
        this.lightDir *= -1;
    },
    getz:function (x, z) {
        if(this.tmpData==null) return 0;
        var colx =Math.floor((x / this.size[0] + .5) * ( this.div[0]));
        var colz =Math.floor((-z / this.size[2] + .5) * ( this.div[1]));
        var pixel = Math.floor(((colz-1)*this.div[0])+colx)*4;
        var result = (this.tmpData[pixel+0]+this.tmpData[pixel+1]+this.tmpData[pixel+2])*this.ratio;
        return result;
    },
    generatePhysicsData : function () {
        var pix, j, n;
        var np = 0;
        var i = this.div[0];
        while (i--) {
            //j = this.div[1];
            //while (j--) {
            for (j = 0; j < this.div[1]; j++) {
                n = ((i)*this.div[0])+(j+1);
                pix = n*4;
                np ++;
                this.hfFloatBuffer[np] = (this.tmpData[pix+0]+this.tmpData[pix+1]+this.tmpData[pix+2])*this.ratio;
            }
        }

        //UP_TERRAIN(this.hfFloatBuffer);
    }

}

// WATER

/*TERRAIN.Water = function(size, renderer, camera, scene) {
    this.size = size;
    this.waterNormals = new THREE.ImageUtils.loadTexture( 'images/water.jpg' );
    this.waterNormals.wrapS = this.waterNormals.wrapT = THREE.RepeatWrapping; 
    //this.waterNormal.format = THREE.RGBFormat;

    this.water = new THREE.Water( renderer, camera, scene , {
        textureWidth: 256, 
        textureHeight: 256,
        waterNormals: this.waterNormals,
        alpha:  0.6,
        sunDirection:  directionalLight.position.normalize(),
        sunColor: 0xffffee,
        waterColor: 0x001e0f,
        distortionScale: 50.0,
        fog: true,
    } );

    this.mirrorMesh = new THREE.Mesh( new THREE.PlaneGeometry(this.size[0], this.size[2], 10, 10 ),  this.water.material);
    this.mirrorMesh.add( this.water );
    this.mirrorMesh.rotation.x = - Math.PI * 0.5;
    this.mirrorMesh.position.y = -0.1
    scene.add( this.mirrorMesh );
}

TERRAIN.Water.prototype = {
    constructor: TERRAIN.Water,
    clear:function () {
        scene.remove( this.mirrorMesh );
    },
    render:function () {
        this.water.material.uniforms.time.value += 1.0 / 60.0;
        this.water.render();
    }
}*/


V.TerrainNormal = {

    uniforms: {
        'heightMap':  { type: 't', value: null },
        'resolution': { type: 'v2', value: new THREE.Vector2( 128, 128 ) },
        'scale':      { type: 'v2', value: new THREE.Vector2( 0, 0 ) },
        'height':     { type: 'f', value: 0.05 }
    },

    vs: [

        'varying vec2 vUv;',

        'void main() {',

            'vUv = uv;',
            'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

        '}'

    ].join('\n'),

    fs: [

        'uniform float height;',
        'uniform vec2 resolution;',
        'uniform sampler2D heightMap;',

        'varying vec2 vUv;',

        'void main() {',

            'float val = texture2D( heightMap, vUv ).x;',

            'float valU = texture2D( heightMap, vUv + vec2( 1.0 / resolution.x, 0.0 ) ).x;',
            'float valV = texture2D( heightMap, vUv + vec2( 0.0, 1.0 / resolution.y ) ).x;',

            'gl_FragColor = vec4( ( 0.5 * normalize( vec3( val - valU, val - valV, height  ) ) + 0.5 ), 1.0 );',

        '}'

    ].join('\n')

};


V.TerrainNoise = {

    uniforms:{ 
        time:   { type: 'f', value: 1.0 },
        scale:  { type: 'v2', value: new THREE.Vector2( 1.5, 1.5 ) },
        offset: { type: 'v2', value: new THREE.Vector2( 0, 0 ) },
    },
    fs: [

        'uniform float time;',
        'varying vec2 vUv;',

        'vec4 permute( vec4 x ) {',

            'return mod( ( ( x * 34.0 ) + 1.0 ) * x, 289.0 );',

        '}',

        'vec4 taylorInvSqrt( vec4 r ) {',

            'return 1.79284291400159 - 0.85373472095314 * r;',

        '}',

        'float snoise( vec3 v ) {',

            'const vec2 C = vec2( 1.0 / 6.0, 1.0 / 3.0 );',
            'const vec4 D = vec4( 0.0, 0.5, 1.0, 2.0 );',

            '// First corner',

            'vec3 i  = floor( v + dot( v, C.yyy ) );',
            'vec3 x0 = v - i + dot( i, C.xxx );',

            '// Other corners',

            'vec3 g = step( x0.yzx, x0.xyz );',
            'vec3 l = 1.0 - g;',
            'vec3 i1 = min( g.xyz, l.zxy );',
            'vec3 i2 = max( g.xyz, l.zxy );',

            'vec3 x1 = x0 - i1 + 1.0 * C.xxx;',
            'vec3 x2 = x0 - i2 + 2.0 * C.xxx;',
            'vec3 x3 = x0 - 1. + 3.0 * C.xxx;',

            '// Permutations',

            'i = mod( i, 289.0 );',
            'vec4 p = permute( permute( permute(',
                    ' i.z + vec4( 0.0, i1.z, i2.z, 1.0 ) )',
                   '+ i.y + vec4( 0.0, i1.y, i2.y, 1.0 ) )',
                   '+ i.x + vec4( 0.0, i1.x, i2.x, 1.0 ) );',

            '// Gradients',
            '// ( N*N points uniformly over a square, mapped onto an octahedron.)',

            'float n_ = 1.0 / 7.0; // N=7',

            'vec3 ns = n_ * D.wyz - D.xzx;',

            'vec4 j = p - 49.0 * floor( p * ns.z *ns.z );  //  mod(p,N*N)',

            'vec4 x_ = floor( j * ns.z );',
            'vec4 y_ = floor( j - 7.0 * x_ );    // mod(j,N)',

            'vec4 x = x_ *ns.x + ns.yyyy;',
            'vec4 y = y_ *ns.x + ns.yyyy;',
            'vec4 h = 1.0 - abs( x ) - abs( y );',

            'vec4 b0 = vec4( x.xy, y.xy );',
            'vec4 b1 = vec4( x.zw, y.zw );',


            'vec4 s0 = floor( b0 ) * 2.0 + 1.0;',
            'vec4 s1 = floor( b1 ) * 2.0 + 1.0;',
            'vec4 sh = -step( h, vec4( 0.0 ) );',

            'vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;',
            'vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;',

            'vec3 p0 = vec3( a0.xy, h.x );',
            'vec3 p1 = vec3( a0.zw, h.y );',
            'vec3 p2 = vec3( a1.xy, h.z );',
            'vec3 p3 = vec3( a1.zw, h.w );',

            '// Normalise gradients',

            'vec4 norm = taylorInvSqrt( vec4( dot( p0, p0 ), dot( p1, p1 ), dot( p2, p2 ), dot( p3, p3 ) ) );',
            'p0 *= norm.x;',
            'p1 *= norm.y;',
            'p2 *= norm.z;',
            'p3 *= norm.w;',

            '// Mix final noise value',

            'vec4 m = max( 0.6 - vec4( dot( x0, x0 ), dot( x1, x1 ), dot( x2, x2 ), dot( x3, x3 ) ), 0.0 );',
            'm = m * m;',
            'return 42.0 * dot( m*m, vec4( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 ), dot( p3, x3 ) ) );',

        '}',

        'float surface3( vec3 coord ) {',

            'float n = 0.0;',

            'n += 1.0 * abs( snoise( coord ) );',
            'n += 0.5 * abs( snoise( coord * 2.0 ) );',
            'n += 0.25 * abs( snoise( coord * 4.0 ) );',
            'n += 0.125 * abs( snoise( coord * 8.0 ) );',

            'return n;',

        '}',

        'void main( void ) {',

            'vec3 coord = vec3( vUv, -time );',
            'float n = surface3( coord );',

            'gl_FragColor = vec4( vec3( n, n, n ), 1.0 );',

        '}'

    ].join('\n'),

    vs: [

        'varying vec2 vUv;',
        'uniform vec2 scale;',
        'uniform vec2 offset;',

        'void main( void ) {',

            'vUv = uv * scale + offset;',
            'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',

        '}',

    ].join('\n')
};

V.TerrainLuminosity = {

uniforms: {
    'tDiffuse': { type: 't', value: null }
},

vs: [
    'varying vec2 vUv;',
    'void main() {',
        'vUv = uv;',
        'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}'
].join('\n'),
fs: [
    'uniform sampler2D tDiffuse;',
    'varying vec2 vUv;',
    'void main() {',
        'vec4 texel = texture2D( tDiffuse, vUv );',
        'vec3 luma = vec3( 0.299, 0.587, 0.114 );',
        'float v = dot( texel.xyz, luma );',
        'gl_FragColor = vec4( v, v, v, texel.w );',
    '}'
].join('\n')
};



V.TerrainShader = {
uniforms:{
    env : { type: 't', value: null },
    enableReflection: { type: 'i', value: 0 },
    useRefract : { type: 'i', value: 0 },
    reflectivity : { type: 'f', value: 1.0 },
    refractionRatio : { type: 'f', value: 0.98 },
    combine : { type: 'i', value: 0 },
    fogcolor : { type: 'c', value:  new THREE.Color( 0x25292e ) },

                'oceanTexture'  : { type: 't', value: null },
                'sandyTexture'  : { type: 't', value: null },
                'grassTexture'  : { type: 't', value: null },
                'rockyTexture'  : { type: 't', value: null },
                'snowyTexture'  : { type: 't', value: null },

                'enableDiffuse1'  : { type: 'i', value: 0 },
                'enableDiffuse2'  : { type: 'i', value: 0 },
                'enableSpecular'  : { type: 'i', value: 1 },
                'enableFog': { type: 'i', value: 1 },

                'tDiffuse1'    : { type: 't', value: null },
                'tDiffuse2'    : { type: 't', value: null },
                'tDetail'      : { type: 't', value: null },
                'tNormal'      : { type: 't', value: null },
                'tSpecular'    : { type: 't', value: null },
                'tDisplacement': { type: 't', value: null },

                'uNormalScale': { type: 'f', value: 1.0 },

                'uDisplacementBias': { type: 'f', value: 0.0 },
                'uDisplacementScale': { type: 'f', value: 1.0 },

                'diffuse': { type: 'c', value: new THREE.Color( 0xeeeeee ) },
                'specular': { type: 'c', value: new THREE.Color( 0xFF1111 ) },
                'ambient': { type: 'c', value: new THREE.Color( 0x050505 ) },
                'shininess': { type: 'f', value: 30 },
                'opacity': { type: 'f', value: 1 },

                'vAmount': { type: 'f', value: 30 },

                'uRepeatBase'    : { type: 'v2', value: new THREE.Vector2( 1, 1 ) },
                'uRepeatOverlay' : { type: 'v2', value: new THREE.Vector2( 1, 1 ) },

                'uOffset' : { type: 'v2', value: new THREE.Vector2( 0, 0 ) }
        },

        //] ),

        fs: [
            //'precision highp float;',
            'uniform sampler2D env;',
            'uniform sampler2D oceanTexture;',
            'uniform sampler2D sandyTexture;',
            'uniform sampler2D grassTexture;',
            'uniform sampler2D rockyTexture;',
            'uniform sampler2D snowyTexture;',

            'uniform bool useRefract;',
            'uniform float refractionRatio;',
            'uniform float reflectivity;',
            'uniform bool enableReflection;',
            'uniform bool enableFog;',

            'varying float vAmount;',

            'uniform vec3 fogcolor;',
            'uniform vec3 ambient;',
            'uniform vec3 diffuse;',
            'uniform vec3 specular;',
            'uniform float shininess;',
            'uniform float opacity;',

            'uniform bool enableDiffuse1;',
            'uniform bool enableDiffuse2;',
            'uniform bool enableSpecular;',

            'uniform sampler2D tDiffuse1;',
            'uniform sampler2D tDiffuse2;',
            'uniform sampler2D tDetail;',
            'uniform sampler2D tNormal;',
            'uniform sampler2D tSpecular;',
            'uniform sampler2D tDisplacement;',

            'uniform float uNormalScale;',

            'uniform vec2 uRepeatOverlay;',
            'uniform vec2 uRepeatBase;',

            'uniform vec2 uOffset;',

            'varying vec3 vTangent;',
            'varying vec3 vBinormal;',
            'varying vec3 vNormal;',
            'varying vec2 vUv;',
            'varying vec2 vN;',


            'varying vec3 vViewPosition;',
            'varying vec3 vWorldPosition;',

            //THREE.ShaderChunk[ 'shadowmap_pars_fragment' ],
            //THREE.ShaderChunk[ 'envmap_pars_fragment' ],
            //THREE.ShaderChunk[ 'fog_pars_fragment' ],
            

            'void main() {',

                'vec2 uvOverlay = uRepeatOverlay * vUv + uOffset;',
                'vec2 uvBase = uRepeatBase * vUv;',

                'vec4 water = (smoothstep(0.01, 0.20, vAmount) - smoothstep(0.24, 0.26, vAmount)) * texture2D( oceanTexture, uvOverlay );',
                'vec4 sandy = (smoothstep(0.10, 0.30, vAmount) - smoothstep(0.28, 0.31, vAmount)) * texture2D( sandyTexture, uvOverlay );',
                'vec4 grass = (smoothstep(0.28, 0.40, vAmount) - smoothstep(0.35, 0.40, vAmount)) * texture2D( grassTexture, uvOverlay );',
                'vec4 rocky = (smoothstep(0.30, 0.76, vAmount) - smoothstep(0.40, 0.70, vAmount)) * texture2D( rockyTexture, uvOverlay );',
                'vec4 snowy = (smoothstep(0.80, 0.99, vAmount))                                   * texture2D( snowyTexture, uvOverlay );',

                'gl_FragColor = vec4( vec3( 1.0 ), opacity );',

                'vec3 specularTex = vec3( 1.0 );',

                

                'vec3 normalTex = texture2D( tDetail, uvOverlay ).xyz * 2.0 - 1.0;',
                'normalTex.xy *= uNormalScale;',
                'normalTex = normalize( normalTex );',

                

                'if( enableDiffuse1 && enableDiffuse2 ) {',

                    'vec4 colDiffuse1 = texture2D( tDiffuse1, uvOverlay );',
                    'vec4 colDiffuse2 = texture2D( tDiffuse2, uvOverlay );',

                    /*'#ifdef GAMMA_INPUT',

                        'colDiffuse1.xyz *= colDiffuse1.xyz;',
                        'colDiffuse2.xyz *= colDiffuse2.xyz;',

                    '#endif',*/

                    'gl_FragColor = gl_FragColor * mix ( colDiffuse1, colDiffuse2, 1.0 - texture2D( tDisplacement, uvBase ) );',
                    //'gl_FragColor = gl_FragColor * mix ( colDiffuse1, colDiffuse2, 1.0 - texture2D( tDisplacement, uvBase ) )+ water + sandy + grass + rocky + snowy;',
                    'gl_FragColor = vec4( gl_FragColor.xyz, 1.0 )+ water + sandy + grass + rocky + snowy;',
                    //'fullTexture = vec4( gl_FragColor.xyz, 1.0 )+ water + sandy + grass + rocky + snowy;',
                    //'gl_FragColor.xyz = mix( gl_FragColor.xyz, fullTexture, 1.0 );',


                ' } else if( enableDiffuse1 ) {',

                    'gl_FragColor = gl_FragColor * texture2D( tDiffuse1, uvOverlay );',
                    //'gl_FragColor = gl_FragColor * texture2D( tDiffuse1, uvOverlay ) + water + sandy + grass + rocky + snowy;',
                    //'gl_FragColor = gl_FragColor * mix ( tDiffuse1, water + sandy + grass + rocky + snowy, 1.0 - texture2D( tDisplacement, uvBase ) );',

                '} else if( enableDiffuse2 ) {',

                    'gl_FragColor = gl_FragColor * texture2D( tDiffuse2, uvOverlay );',

                '}',

                'if( enableSpecular )',
                    'specularTex = texture2D( tSpecular, uvOverlay ).xyz;',

                'mat3 tsb = mat3( vTangent, vBinormal, vNormal );',
                'vec3 finalNormal = tsb * normalTex;',

                'vec3 normal = normalize( finalNormal );',
                'vec3 viewPosition = normalize( vViewPosition );',


                'if ( enableReflection ) {',
                // environment
                    'vec3 ev = texture2D( env, vN ).rgb;',
                    //'gl_FragColor.xyz *= ev;',
                    'gl_FragColor.xyz = mix( gl_FragColor.xyz, ev.xyz, reflectivity );',
                '}',

                // fog
                'if(enableFog){',
                    'float circle_radius_min = 0.3;',
                    'float circle_radius_max = 0.5;',
                    'float fogDensity = 0.4;',
                    'float fog_far = 30.4;',
                    'vec2 nuv = vUv - vec2(0.5, 0.5);',
                    'float dist =  sqrt(dot(nuv, nuv));',
                    //'vec3 fog_color = vec3(1.0/37., 1.0/41., 1.0/46.);',
                    'float fog = 0.0;',
                    'if ( dist > circle_radius_min )',
                    'fog =(dist-circle_radius_min)*5.0;',

                    //'float fog = fogDensity * (gl_FragCoord.z / gl_FragCoord.w) / fog_far;',
                    //'float fog = fogDensity * (vUv.x / vUv.y) / fog_far;',
                    //'fog -= .2;',
                    //'vec3 col = mix( fogcolor, gl_FragColor.xyz , clamp(1. - fog, 0., 1.));',
                    //'gl_FragColor = vec4(col, 1.);',
                    'gl_FragColor = vec4(gl_FragColor.xyz, 1.-fog);',
                '}',

            '}'

        ].join('\n'),

        vs: [
            //'precision highp float;',
            'attribute vec4 tangent;',

            'uniform vec2 uRepeatBase;',

            'uniform sampler2D tNormal;',

            'uniform sampler2D tDisplacement;',
            'uniform float uDisplacementScale;',
            'uniform float uDisplacementBias;',

            'varying vec3 vTangent;',
            'varying vec3 vBinormal;',
            'varying vec3 vNormal;',
            'varying vec2 vUv;',

            'varying vec3 vViewPosition;',
            'varying vec3 vWorldPosition;',
            'varying float vAmount;',
            // spherical test
            'varying vec2 vN;',
            'varying vec3 vPos;',

            'void main() {',

                'vNormal = normalize( normalMatrix * normal );',

                // tangent and binormal vectors

                'vTangent = normalize( normalMatrix * tangent.xyz );',

                'vBinormal = cross( vNormal, vTangent ) * tangent.w;',
                'vBinormal = normalize( vBinormal );',

                // texture coordinates

                'vUv = uv;',

                'vec4 bumpData = texture2D( tDisplacement, uv );',
                'vAmount = bumpData.r;',

                'vec2 uvBase = uv * uRepeatBase;',

                // displacement mapping

                'vec3 dv = texture2D( tDisplacement, uvBase ).xyz;',
                'float df = uDisplacementScale * dv.x + uDisplacementBias;',
                'vec3 displacedPosition = normal * df + position;',

                'vec4 worldPosition = modelMatrix * vec4( displacedPosition, 1.0 );',
                'vec4 mvPosition = modelViewMatrix * vec4( displacedPosition, 1.0 );',


                'gl_Position = projectionMatrix * mvPosition;',

                'vWorldPosition = worldPosition.xyz;',
                'vViewPosition = -mvPosition.xyz;',

                'vec3 normalTex = texture2D( tNormal, uvBase ).xyz * 2.0 - 1.0;',
                'vNormal = normalMatrix * normalTex;',

                // spherical
                'vPos = normalize( vec3( mvPosition ) );',
                //'vNormal = normalize( normalMatrix * normal );',
                'vec3 r = reflect( vPos, normalize(vNormal) );',
                'float m = 2. * sqrt( pow( r.x, 2. ) + pow( r.y, 2. ) + pow( r.z + 1., 2. ) );',
                'vN = r.xy / m + .5;',
            '}'

        ].join('\n')

    }

//};
//}
