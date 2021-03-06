var v = new V.View(-90, 45, 130, true);
v.tell('The base');
v.addWorker('liquid', onWorker);
var select = null;
v.zone({s:300});

loop();

function loop(){
    v.render();
    requestAnimationFrame( loop );
}

function onWorker(){
	
	var w = 50/2;
    var h = 50/2;

	v.chaine({ points:[-w,h, w,h, w,-h, -w,-h], close:true });

	var x,y;
	var sx,sy,sz;
	for(var i = 0; i<500; i++){
		sx = V.rand(0.1, 1);
		x = V.rand(-20, 20);
		y = V.rand(-20, 20);
		v.add({type:'sphere', mass:0.1, pos:[x, sx, y], size:[sx,sx,sx] });
	}
}

function mainMove(){
	if (select) {
		select.position.set(v.nav.mouse3d.x, 0, v.nav.mouse3d.z);
		v.upAnchor(select);
	}
}
function mainDown(){
	select = v.anchors[v.nav.selectName];
	if (select) { 
		v.nav.mouse.move = false;
		select.material = v.mat.Sanchor;
	}
}
function mainUp(){
	if (select) { 
		v.nav.mouse.move = true;
		select.material = v.mat.anchor; 
		select = null;
	}
}