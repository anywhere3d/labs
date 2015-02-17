/**   _     _   _     
*    | |___| |_| |__
*    | / _ \  _|    |
*    |_\___/\__|_||_|
*    @author LoTh / http://lo-th.github.io/labs/
*/

V.SeaPool = function(parent){
    this.root = parent;
    this.meshes = {};
}
V.SeaPool.prototype = {
    constructor: V.SeaPool,
    load:function(name, callback, displayList, noLoader){
        this.callback = callback || function(){};
        this.noLoader = noLoader || false;
        var list = "";
        var loader = new THREE.SEA3D( true );
        if(!this.noLoader){
            loader.onProgress = function( e ) {
                this.root.loader.innerHTML = 'Loading '+ name +': '+(e.progress*100).toFixed(0)+'%';
            }.bind(this);
            loader.onDownloadProgress = function( e ) {
                this.root.loader.style.display = 'block';
            }.bind(this);
        }
        loader.onComplete = function( e ) {
            this.root.loader.style.display = 'none';
            this.meshes[name] = {};
            var i = loader.meshes.length, m;
            while(i--){
                m = loader.meshes[i];
                this.meshes[name][m.name] = m;
                list+=m.name+',';
            }
            if(displayList) console.log(list);
            this.callback();
        }.bind(this);

        loader.parser = THREE.SEA3D.DEFAULT;
        loader.load( 'models/'+name+'.sea' );
        //loader.invertZ = true;
        //loader.flipZ = true;
    },
    getGeometry:function(obj, name){
        var g = this.meshes[obj][name].geometry;
        var mtx = new THREE.Matrix4().makeScale(1, 1, -1);
        g.applyMatrix(mtx);
        return g;
    }
}

V.ProjectUV = function( g, mat ){
    if ( g.boundingBox === null ) g.computeBoundingBox();
    var max = g.boundingBox.max;
    var min = g.boundingBox.min;
    mat.uniforms.offset.value = new THREE.Vector2(0 - min.x, 0 - min.z);
    mat.uniforms.range.value = new THREE.Vector2(max.x - min.x, max.z - min.z);
}

V.TransGeo = function(g, noBuffer){
    g.mergeVertices();
    //g.computeVertexNormals( true );
    //g.computeTangents();
    //g.computeBoundingBox();
    //g.computeBoundingSphere();
    g.verticesNeedUpdate = true;
    g.normalsNeedUpdate = true;
    //g.colorsNeedUpdate = true;

    g.computeFaceNormals();
    //g.normalizeNormals();
    g.computeVertexNormals(true);
    g.computeTangents() ;


    //console.log(g.hasTangents) 

    //g.dynamic = false;

    if(!noBuffer){
        var bg = new THREE.BufferGeometry().fromGeometry(g);
        g.dispose();
        return bg;
    } else{
        return g;
    }
}

// TEXTURES

V.ImgPool = function(parent){
    this.root = parent;
    this.imgs = {};
}
V.ImgPool.prototype = {
    constructor: V.ImgPool,
    load:function(folder, url, callback){
        this.callback = callback || function(){};
        this.folder = folder || 'images/';
        if(typeof url == 'string' || url instanceof String){
            var singleurl = url;
            url = [singleurl];
        }
        this.total = url.length;
        this.root.loader.style.display = 'block';
        this.loadnext(url);
    },
    loadnext:function(url){
        var img = new Image();
        img.onload = function(){
            var name = url[0].substring(url[0].lastIndexOf("/")+1, url[0].lastIndexOf("."));
            this.imgs[name] = img;
            url.shift();
            if(url.length){
                this.root.loader.innerHTML = 'Loading images: '+ url.length;
                this.loadnext(url);
            }else{ 
                this.root.loader.style.display = 'none';
                this.callback();
            }
        }.bind(this);
        img.src = this.folder+url[0];
    },
    texture:function( name, flip, repeat, linear, format ){
        var tx = new THREE.Texture(this.imgs[name]);
        tx.flipY = flip || false;
        if(repeat)tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
        if(linear)tx.minFilter = tx.magFilter = THREE.LinearFilter;
        if(format)tx.format = THREE.RGBFormat;

        tx.needsUpdate = true;
        return tx;
    }
}