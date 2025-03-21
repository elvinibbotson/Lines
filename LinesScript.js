// GLOBAL VARIABLES
var dbVersion=1;
var name=null;
var size=0; // drawing size default to A4
var aspect='landscape'; // default orientation
var scale=1; // default scale is 1:1
var scaleF=3.78; // default scale factor for mm (1:1 scale)
var gridSize=300; // default grid size is 300mm
var gridSnap=false; // grid snap off by default
var handleR=2; // 2mm handle radius at 1:1 scale - increase for smaller scales (eg. 100 at 1:50)
var boxR=5; // radius for corners of round-cornered boxes
var rad=0; // ditto for current box
var snapD=2*scale; // 2mm snap distance at 1:1 scale - increase for smaller scales (eg. 100 at 1:50)
var snap=false; // flags if snapping to a node
var zoom=1; // start zoomed out to full drawing
var mode=null;
var scr={}; // screen size .w & .h and cursor coordinates .x & .y
var dwg={}; // drawing size .w & .h and offset .x & .y
var x=0;
var y=0;
var x0=0;
var y0=0;
var dx=0;
var dy=0;
var w=0;
var h=0; 
var datum1={'x':0,'y':0,'n':0};
var datum2={'x':0,'y':0,'n':0};
var offset={'x':0,'y':0};
var spinOffset={'x':0,'y':0};
var arc={};
var dim={};
var selectionBox={}; // for box select
var selection=[]; // list of elements in selectionBox
var selectedPoints=[]; // list of selected points in line or shape
var anchor=false; // flags existance of anchor
var db=null; // indexed database holding SVG elements
var nodes=[]; // array of nodes each with x,y coordinates and element ID+n
var elNodes=[]; // array of nodes for selected element
var node=0; // node number (0-9) within selected element
var dims=[]; // array of links between elements and dimensions
var layers=[]; // array of layer objects
var layer=0;
var thisLayerOnly=false; // limit select & edit to current layer?
var element=null; // current element
var elID=null; // id of current element
var memory=[]; // holds element states to allow undo
var blueline=null; // bluePolyline
var path=''; // bluePath definition
var set=null; // current set
var setID=null; // id of current set
var lineType='solid'; // default styles
var lineStyle='square';
var lineColor='black';
var pen=0.25; // 0.25mm at 1:1 scale - increase for smaller scales (eg.12.5 at 1:50 scale)
var fillType='solid';
var fillColor='white';
var opacity='1';
var blur=0;
var textSize=5; // default text size
var textFont='sans-serif'; // sans-serif font
var textStyle='fine'; // normal text
var currentDialog=null;
var sizes=['A4','A5','21cm square','15x10cm','18x13cm','20x15cm','25x20cm'];
var widths=[297,210,210,150,180,200,250.210,148,210,100,130,150,200];
var heights=[210,148,210,100,130,150,200,297,210,210,150,180,200,250];
class Point {
    constructor(x,y) {
        this.x=x;
        this.y=y;
    }
}
class StringPoint {
    constructor(string) {
    	var n=string.indexOf(',');
    	this.x=Number(string.substring(0,n));
    	this.y=Number(string.substring(n+1));
    }
}
scr.w=window.innerWidth; // scr.w=screen.width;
scr.h=window.innerHeight; // scr.h=screen.height;
dwg.x=dwg.y=0;
// console.log("screen size "+scr.w+"x"+scr.h);
name=window.localStorage.getItem('name');
size=window.localStorage.getItem('size');
aspect=window.localStorage.getItem('aspect');
scale=window.localStorage.getItem('scale');
gridSize=window.localStorage.getItem('gridSize');
gridSnap=window.localStorage.getItem('gridSnap');
layerData=window.localStorage.getItem('layers');
if(name===null) name='unnamed';
if(size===null) size=0;
if(scale===null) scale=1;
if(!gridSize) gridSize=300;
if(!gridSnap) gridSnap=0;
// console.log('grid checked: '+getElement('gridSnap').checked);
// console.log('name: '+name+'; aspect: '+aspect+'; scale: '+scale+'; grid: '+gridSize+' '+gridSnap);
if(!layerData) { // initialise layers first time
	layers=[];
	for(var i=0;i<10;i++) {
		layers[i]={};
		layers[i].name='';
		layers[i].show=(i<0)?true:false; // start just showing first drawing layer...
		layers[i].checked=(i<0)?true:false;
	}
	layer=0;
	for(var i=1;i<10;i++) {
		getElement('layerName'+i).value=layers[i].name;
	}
	var data={};
    data.layers=[];
    for(i=0;i<10;i++) {
    	data.layers[i]={};
    	data.layers[i].name=layers[i].name;
    	data.layers[i].show=layers[i].show;
    }
	var json=JSON.stringify(data);
	// console.log('layers JSON: '+json);
	window.localStorage.setItem('layers',json);
}
else { // use saved layers
	var json=JSON.parse(layerData);
	layers=json.layers;
}
// console.log(layers.length+' layers - layer[0] visible? '+layers[0].show);
for(var i=0;i<10;i++) { // set layers dialog
	getElement('layer'+i).checked=layers[i].checked;
	if(layers[i].checked) layer=i;
	getElement('layerName'+i).value=layers[i].name;
	if(!layers[i].name) getElement('layerName'+i).value='';
	getElement('layerCheck'+i).checked=layers[i].show;
	getElement('layer').innerText=layer;
}
if(!aspect) {
    aspect=(scr.w>scr.h)?'landscape':'portrait';
    getElement('drawingAspect').innerText=aspect;
    showDialog('newDrawingDialog',true);
}
else initialise();
document.addEventListener('contextmenu',event=>event.preventDefault()); // disable annoying pop-up menu
// TOOLS
getElement('layersButton').addEventListener('click',function() {
	showDialog('layerDialog',true);
});
for(var i=0;i<10;i++) {
	getElement('layer'+i).addEventListener('change',setLayers);
	getElement('layerName'+i).addEventListener('change',setLayers);
	getElement('layerCheck'+i).addEventListener('click',setLayerVisibility);
}
getElement('thisLayerOnly').addEventListener('change',function() {
	thisLayerOnly=getElement('thisLayerOnly').checked;
	// console.log('this layer only is '+thisLayerOnly);
});
getElement('docButton').addEventListener('click',function() {
	getElement('drawingName').innerHTML=name;
    getElement('drawingSize').innerHTML=sizes[size];
    getElement('drawingScale').innerHTML=scale;
    getElement('drawingAspect').innerHTML=aspect;
    getElement('gridSnap').checked=(gridSnap>0)?true:false;
    // console.log('grid is '+gridSnap);
    showDialog('docDialog',true);
});
getElement('gridSnap').addEventListener('change',function() {
   gridSnap=(getElement('gridSnap').checked)?1:0;
   window.localStorage.setItem('gridSnap',gridSnap);
   // console.log('grid is '+gridSnap);
});
getElement('gridSize').addEventListener('change',function() {
    gridSize=parseInt(getElement('gridSize').value);
    window.localStorage.setItem('gridSize',gridSize);
    // console.log('grid is '+gridSize);
});
getElement('new').addEventListener('click',function() {
    // console.log("show newDrawingDialog - screen size: "+scr.w+'x'+scr.h);
    showDialog('newDrawingDialog',true);
});
getElement('createNewDrawing').addEventListener('click',function() {
	size=getElement('sizeSelect').value;
	aspect=getElement('aspectSelect').value;
    scale=getElement('scaleSelect').value;
    // console.log('create new drawing - size:'+size+'('+sizes[size]+') aspect:'+aspect+' scale:'+scale);
    var index=parseInt(size);
    if(aspect=='portrait') index+=7;
    dwg.w=widths[index];
    dwg.h=heights[index];
    // console.log('drawing size '+dwg.w+'x'+dwg.h+'(index: '+index+')');
    window.localStorage.setItem('size',size);
    window.localStorage.setItem('aspect',aspect);
    window.localStorage.setItem('scale',scale);
    name='';
    window.localStorage.setItem('name',name);
    elID=0;
    // CLEAR DRAWING IN HTML & DATABASE
    getElement('dwg').innerHTML=''; // clear drawing
    layer=0; // reset layers
	for(var i=0;i<10;i++) {
		getElement('layer'+i).checked=layers[i].checked=(i==0); // select current layer 0
		getElement('layerName'+i).value=layers[i].name='';
		getElement('layerCheck'+i).checked=layers[i].show=(i==0); // start with just layer 0 visible
		getElement('layer').innerText=layer;
	}
	setLayers();
    getElement('handles').innerHTML=''; // clear any edit handles
    var request=db.transaction('graphs','readwrite').objectStore('graphs').clear(); // clear graphs database
    var request=db.transaction('sets','readwrite').objectStore('sets').clear(); // clear sets database
    var request=db.transaction('images','readwrite').objectStore('images').clear(); // clear images database
	request.onsuccess=function(event) {
		console.log("database cleared");
	};
	request.onerror=function(event) {
		console.log("error clearing database");
	};
    showDialog('newDrawingDialog',false);
    window.localStorage.setItem('name',name);
    initialise();
});
getElement('load').addEventListener('click',function() {
    getElement('drawing').checked=true;
    showDialog('loadDialog',true); 
});
getElement('confirmLoad').addEventListener('click',async function(){
	var method='drawing';
    if(getElement('set').checked) method='set';
    else if(getElement('image').checked) method='image';
    // console.log('load method: '+method);
    // console.log('show file chooser');
	var [handle]=await window.showOpenFilePicker();
	// console.log('file handle: '+handle);
	var file=await handle.getFile();
	if(method=='image') addImage(file);
	else {
		// console.log('load file '+file+' name: '+file.name+' type '+file.type+' '+file.size+' bytes');
    	var loader=new FileReader();
    	loader.addEventListener('load',function(evt) {
        	var data=evt.target.result;
        	// console.log('data: '+data.length+' bytes');
      		var json=JSON.parse(data);
      		layers=json.layers;
			var transaction=db.transaction(['graphs','sets'],'readwrite');
			var graphStore=transaction.objectStore('graphs');
			var setStore=transaction.objectStore('sets');
			if(method=='set') { // load selected set(s)
				var sets=json.sets;
				for(var i=0;i<sets.length;i++) {
					var name=sets[i].name;
		    		// console.log("add set "+name);
					var request=setStore.add(sets[i]);
					request.onsuccess=function(e) {
						console.log("set added");
					};
					request.onerror=function(e) {console.log("error adding sets");};
				}
			}
			else { // load drawing
				if(method=='drawing') {
		    	name=file.name;
		   		var n=name.indexOf('.json');
		   		name=name.substr(0,n);
		   		window.localStorage.setItem('name',name);
		   		getElement('dwg').innerHTML=''; // clear drawing
           		getElement('handles').innerHTML=''; // clear any edit handles
	    		graphStore.clear();
		    	setStore.clear();
		   		nodes=[];
		   		dims=[];
		   		size=json.size;
				window.localStorage.setItem('size',size);
	    		aspect=json.aspect;
	    		window.localStorage.setItem('aspect',aspect);
		    	scale=json.scale;
		   		window.localStorage.setItem('scale',scale);
		   		// console.log('load drawing - aspect:'+aspect+' scale:'+scale);
		   		initialise();
			}
				// reset();
	  			for(var i=0;i<json.graphs.length;i++) {
		    		// console.log('add graph '+json.graphs[i].type);
	        		var request=graphStore.add(json.graphs[i]);
	        		request.onsuccess=function(e){
	        		// console.log('saved graph');
	        	}
	  			}
	        	for(i=0;i<json.sets.length;i++) {
		       	// console.log('add set '+json.sets[i].name);
		       	request=setStore.add(json.sets[i]);
		   	}
			}
			transaction.oncomplete=function() {
            	if(method=='drawing') load();
            	else if(method=='set') listSets();
            	else listImages();
			}
        });
		loader.addEventListener('error',function(event) {
        	console.log('load failed - '+event);
    	});
    	loader.readAsText(file);
    }
    showDialog('loadDialog',false);
});
getElement('save').addEventListener('click',function() {
    // name=window.localStorage.getItem('name');
    // if(name) getElement('saveName').value=name;
    showDialog('saveDialog',true);
});
getElement('confirmSave').addEventListener('click',async function() {
    if(getElement('data').checked) {
    	// console.log('save data to json file');
    	var data={};
    	if(name) data.name=name;
    	data.layers=layers;
    	data.size=size;
    	data.aspect=aspect;
    	data.scale=scale;
    	data.graphs=[];
    	data.sets=[];
    	var transaction=db.transaction(['graphs','sets']);
    	var request=transaction.objectStore('graphs').openCursor();
    	request.onsuccess=function(event) {
    		var cursor=event.target.result;
        	if(cursor) {
            	delete cursor.value.id;
            	data.graphs.push(cursor.value);
            	// data.graphs[index]=cursor.value;
            	cursor.continue();
        	}
        	else {
            	// console.log('save '+data.graphs.length+' graphs');
        		request=transaction.objectStore('sets').openCursor();
        		request.onsuccess=function(event) {
                	cursor=event.target.result;
                	if(cursor) {
                    	// console.log('set: '+cursor.value.name);
                    	delete cursor.value.id; // SHOULDN'T NEED THIS
                    	data.sets.push(cursor.value);
                    	cursor.continue();
                	}
                	else {
                    	// console.log('save '+data.sets.length+' sets');
                	}
            	}
        	}
    	}
    	transaction.oncomplete=function() {
    		// console.log('ready to save drawing data to file');
    		var json=JSON.stringify(data);
    		save(name,json,'json');
    	}
    }
    else if(getElement('print').checked) {
    	// console.log('save drawing as SVG');
    	getElement('datumSet').style.display='none';
    	var content='<svg xmlns="http://www.w3.org/2000/svg" width="'+dwg.w+'mm" height="'+dwg.h+'mm" viewBox="0 0 '+dwg.w+' '+dwg.h+'">';
    	var elements=getElement('dwg').children;
    	for(var i=0;i<elements.length;i++) {
    		var el=elements[i];
    		// console.log('element '+el+': '+el.outerHTML+'; style: '+el.getAttribute('style')+'; fillType: '+el.getAttribute('fillType'));
    		if(el.getAttribute('style')===null) content+=el.outerHTML;
    		else if(el.getAttribute('style').indexOf('none')<0) content+=el.outerHTML;
    		if(el.getAttribute('fillType').startsWith('pattern')) {
    			// console.log('PATTERN FILL: pattern'+el.id);
	    		content+=getElement('pattern'+el.id).outerHTML; // include pattern definition
    		}
    	}
    	content+='</svg>';
    	// console.log('SVG: '+content);
    	save(name,content,'svg');
		getElement('datumSet').style.display='block';
    }
    else { // save set(s)
    	var selectedSets=[];
    	var request=db.transaction('sets','readonly').objectStore('sets').openCursor();
    	request.onsuccess=function(event) {
    		var cursor=event.target.result;
        	if(cursor) {
				var setName=cursor.value.name;
				if(getElement('$'+setName).checked) selectedSets.push({name:setName, svg:cursor.value.svg});
            	cursor.continue();
        	}
        	else {
            	// console.log('all sets checked '+selectedSets.length+' selected');
            	var json='{"sets":[';
            	for(var i=0;i<selectedSets.length;i++) {
            		json+='{"name":"'+selectedSets[i].name+'","svg":"'+selectedSets[i].svg+'"}';
            		if(i<selectedSets.length-1) json+=','; // separate sets
            	};
            	json+=']}';
            	// console.log('save sets JSON: '+json);
            	save('',json,'json');
        	}
    	}
		request.onerror=function(e) { console.log('failed to check setst');}
    }
    showDialog('saveDialog',false);
});
getElement('zoomInButton').addEventListener('click',function() {
    zoom*=2;
    // console.log('zoom in to '+zoom);
    snapD/=2; // avoid making snap too easy
    handleR/=2; // avoid oversizing edit handles
    rezoom();
});
getElement('zoomOutButton').addEventListener('click',function() {
    zoom/=2;
    // console.log('zoom out to '+zoom);
    snapD*=2;
    handleR*=2;
    rezoom();
});
getElement('extentsButton').addEventListener('click',function() {
    zoom=1;
    dwg.x=0;
    dwg.y=0;
    rezoom();
});
getElement('panButton').addEventListener('click',function() {
    mode='pan';
});
// DRAWING TOOLS
getElement('curveButton').addEventListener('click',function() {
    mode='curve';
    hint('CURVE: drag from start',3);
});
getElement('lineButton').addEventListener('click',function() {
    mode='line';
    showInfo(true,'LINE',layer,'drag from start');
});
getElement('boxButton').addEventListener('click',function() {
    mode='box';
    rad=0;
    showInfo(true,'BOX',layer,'drag from corner');
});
getElement('ovalButton').addEventListener('click',function() { // OVAL/CIRCLE
    mode='oval';
    showInfo(true,'OVAL',layer,'drag from centre');
})
getElement('arcButton').addEventListener('click', function() {
   mode='arc';
   showInfo(true,'ARC',layer,'drag from start');
});
getElement('textButton').addEventListener('click',function() {
    mode='text';
    hint('TEXT: tap at start');
});
getElement('textOKbutton').addEventListener('click',function() {
	var text=getElement('text').value;
	// console.log('text: '+text);
	if(element) { // change selected text
        element.innerHTML=text;
        updateGraph(element.id,['text',text],true);
    }
    else {
        // console.log('add text '+text+' - '+textFont+','+textStyle+','+textSize);
        var graph={}
	    graph.type='text';
	    graph.text=text;
	    graph.x=x0;
        graph.y=y0;
        graph.spin=0;
        graph.flip=0;
        graph.textSize=textSize;
        graph.textFont=textFont;
        graph.textStyle=textStyle;
        graph.fillType='solid';
	    graph.fill=lineColor;
	    graph.opacity=opacity;
	    graph.layer=layer;
	    var el=addGraph(graph);
    }
    cancel();
})
getElement('dimButton').addEventListener('click',function() {
   mode='dimStart';
   hint('DIMENSION: tap start node');
});
getElement('confirmDim').addEventListener('click',function() {
    dim.dir=document.querySelector('input[name="dimDir"]:checked').value;
    // console.log(dim.dir+' selected');
    showDialog('dimDialog',false);
    getElement('blueDim').setAttribute('x1',dim.x1);
    getElement('blueDim').setAttribute('y1',dim.y1);
    getElement('blueDim').setAttribute('x2',(dim.dir=='v')? dim.x1:dim.x2);
    getElement('blueDim').setAttribute('y2',(dim.dir=='h')? dim.y1:dim.y2);
    getElement('guides').style.display='block';
    hint('DIMENSION: drag to position');
    mode='dimPlace';
});
getElement('setButton').addEventListener('click',function() {
    showDialog('setDialog',true);
});
getElement('imageButton').addEventListener('click',async function() {
	//CHOOSE IMAGE FROM LIST OF IMAGES IN DATABASE
	showDialog('imageDialog',true);
});
getElement('setList').addEventListener('change',function() {
    // console.log('choose '+event.target.value);
    setID=event.target.value;
    // console.log('set '+setID+' picked');
	// console.log('place set '+setID);
    var graph={};
	graph.type='set';
	graph.name=setID;
	graph.x=30*scale;
	graph.y=30*scale;
	graph.spin=0;
	graph.flip=0;
	graph.layer=layer;
	addGraph(graph);
    getElement('setList').value=null; // clear selection for next time
    showDialog('setDialog',false);
});
getElement('imageList').addEventListener('change',function() {
    // console.log('choose '+event.target.value);
    var imageName=event.target.value;
    // console.log('image '+imageName+' picked');
	// console.log('place image '+imageName);
    var graph={};
    var request=db.transaction('images','readonly').objectStore('images').get(imageName);
	request.onsuccess=function(event) {
		graph=event.target.result;
		// console.log('image is '+graph.name);
		graph.type='image';
		// graph.name=imageName;
		graph.x=30*scale;
		graph.y=30*scale;
		graph.width=100*scale;
		graph.height=100*scale;
		graph.spin=0;
		graph.flip=0;
		graph.layer=layer;
		addGraph(graph);
	}
    getElement('imageList').value=null; // clear selection for next time
    showDialog('imageDialog',false);
});
// EDIT TOOLS
getElement('addButton').addEventListener('click',function() { // add point after selected point in line/shape
    var t=type(element);
    if((t!='line')&&(t!='shape')) return; // can only add points to lines/shapes
    // console.log('add point');
    var points=getElement('bluePolyline').points;
    if(points.length>9) {
    	hint('10 node limit');
    	cancel();
    }
    else {
    	hint('ADD POINT: tap on previous point');
    	mode='addPoint';
    }
});
getElement('deleteButton').addEventListener('click',function() {
    var t=type(element);
    if((t=='line')||(t=='shape')) {
        var points=element.points;
        if(selectedPoints.length>0) {  // remove >1 selected points
            hint('DELETE selected points');
            var pts='';
            for(var i=0;i<points.length;i++) {
                if(selectedPoints.indexOf(i)>=0) continue;
                pts+=points.x+','+points.y+' ';
            }
            element.setAttribute('points',pts);
            updateGraph(elID,['points',pts]);
            cancel();
        }
        else { // remove individual point
            var n=points.length;
            if(((t=='line')&&(n>2))||((t=='shape')&&(n>3))) { // if minimum number of nodes, just remove element
                hint('DELETE: tap circle handle to remove element or a disc handle to remove a node');
                mode='removePoint'; // remove whole element or one point
                return;
            }
        }
    }
    for(var i=0;i<selection.length;i++) // console.log('delete '+selection[i]);
    // console.log('element is '+elID);
    showDialog('removeDialog',true);
});
getElement('confirmRemove').addEventListener('click',function() { // complete deletion
    if(selection.length>0) {
        while(selection.length>0) remove(selection.pop());
    }
    else remove(elID);
    element=elID=null;
    getElement('handles').innerHTML=''; // remove edit handles...
    getElement('selection').innerHTML=''; // ...selection shading,...
    getElement('blueBox').setAttribute('width',0); // ...and text outline...
    getElement('blueBox').setAttribute('height',0);
    showDialog('removeDialog',false);
    cancel();
});
getElement('backButton').addEventListener('click',function() {
    var previousElement=element.previousSibling;
    if(previousElement===null) {
        hint('already at back');
        return;
    }
    var previousID=previousElement.getAttribute('id');
    getElement('dwg').insertBefore(element,previousElement); // move back in drawing...
    swopGraphs(previousID,element.id); // ...and in database
    element.id--;
});
getElement('forwardButton').addEventListener('click',function() {
    var nextElement=element.nextSibling;
    if(nextElement===null) {
        hint('already at front');
        return;
    }
    var nextID=nextElement.getAttribute('id');
    // console.log('bring '+type(element)+'('+element.id+') in front of '+type(nextElement)+'('+nextID+')');
    getElement('dwg').insertBefore(nextElement,element); // bring forward in drawing.
	swopGraphs(element.id,nextID); // ...and in database
    element.id++;
});
getElement('moveButton').addEventListener('click',function() {
    // console.log('move '+type(element));
    if(type(element)=='dim') return; // cannot move dimensions
    // getElement('moveRight').value=getElement('moveDown').value=getElement('moveDist').value=getElement('moveAngle').value=0;
    showDialog('textDialog',false);
    showDialog('moveDialog',true);
});
getElement('confirmMove').addEventListener('click',function() {
    // read move parameters and adjust element
    var moveX=getValue('moveRight'); //parseInt(getElement('moveRight').value);
    var moveY=getValue('moveDown'); //parseInt(getElement('moveDown').value);
    var moveD=getValue('moveDist'); //parseInt(getElement('moveDist').value);
    var moveA=getValue('moveAngle'); //parseInt(getElement('moveAngle').value);
    // console.log('move '+moveX+','+moveY+' '+moveD+'@'+moveA);
    if((moveD!=0)&&(moveA!=0)) { // polar coordinates - convert to cartesian
        moveA-=90;
        moveA*=Math.PI/180;
        moveX=moveD*Math.cos(moveA);
        moveY=moveD*Math.sin(moveA);
    }
    if(selection.length<1) selection.push(elID);
    re('member'); // remember positions/points/spins/flips for all selected elements
    if(selectedPoints.length>0) { // move all selected points in a line or shape...
        var points=element.points;
        while(selectedPoints.length>0) {
            var n=selectedPoints.pop();
            points[n].x+=moveX;
            points[n].y+=moveY;
        }
        updateGraph(elID,['points',element.getAttribute('points')]);
    }
    else while(selection.length>0) { // or move all selected elements
        element=getElement(selection.pop());
        move(element,moveX,moveY);
    }
    showDialog('moveDialog',false);
    cancel();
});
getElement('spinButton').addEventListener('click',function() {
    // getElement('spinAngle').value=0;
    showDialog('spinDialog',true);
});
getElement('confirmSpin').addEventListener('click',function() {
    var spin=getValue('spinAngle'); // Number(getElement('spinAngle').value);
    if(selection.length<1) selection.push(elID);
    // console.log('spin '+selection.length+' elements by '+spin+' degrees');
    re('member');
    var axis=null;
    if(anchor) { // spin around an anchor
        axis={};
        axis.x=parseInt(getElement('anchor').getAttribute('x'));
        axis.y=parseInt(getElement('anchor').getAttribute('y'));
    }
    else if(selection.length>1) { // spin around mid-point of multiple elements
        var el=getElement(selection[0]);
        var box=getBounds(el);
        var minX=box.x;
        var maxX=box.x+box.width;
        var minY=box.y;
        var maxY=box.y+box.height;
        console.log('first box '+minX+'-'+maxX+'x'+minY+'-'+maxY);
        for(var i=1;i<selection.length;i++) {
            el=getElement(selection[i]);
            box=getBounds(el);
            if(box.x<minX) minX=box.x;
            if((box.x+box.width)>maxX) maxX=box.x+box.width;
            if(box.y<minY) minY=box.y;
            if((box.y+box.height)>maxY) maxY=box.y+box.height;
        }
        console.log('overall box '+minX+'-'+maxX+'x'+minY+'-'+maxY);
        axis={};
        axis.x=(minX+maxX)/2;
        axis.y=(minY+maxY)/2;
    }
    // if(axis) console.log('axis: '+axis.x+','+axis.y); else console.log('no axis');
    while(selection.length>0) {
        element=getElement(selection.pop());
        elID=element.id;
        // console.log('spin '+type(element));
        var ox=0; // element origin
        var ox=0;
        switch(type(element)) { // elements spin around origin
            case 'line':
            case 'shape':
                ox=element.points[0].x;
                oy=element.points[0].y;
                break;
            case 'box':
                ox=parseInt(element.getAttribute('x'))+parseInt(element.getAttribute('width'))/2;
                oy=parseInt(element.getAttribute('y'))+parseInt(element.getAttribute('height'))/2;
                break;
            case 'text':
            case 'set':
                ox=parseInt(element.getAttribute('x'));
                oy=parseInt(element.getAttribute('y'));
                break;
            case 'oval':
            case 'arc':
                ox=parseInt(element.getAttribute('cx'));
                oy=parseInt(element.getAttribute('cy'));
        }
        var netSpin=parseInt(element.getAttribute('spin'));
        // console.log('change spin from '+netSpin);
        netSpin+=spin;
        // console.log('to '+netSpin);
        element.setAttribute('spin',netSpin);
        updateGraph(elID,['spin',netSpin]);
        setTransform(element);
        if(axis) { // reposition elements, spinning around axis
            console.log('spin element '+elID+' around '+axis.x+','+axis.y);
            dx=ox-axis.x;
            dy=oy-axis.y;
            var d=Math.sqrt(dx*dx+dy*dy);
            var a=Math.atan(dy/dx);
            if(dx<0) spin+=180;
            a+=(spin*Math.PI/180);
            console.log('spin is '+spin+'; a is '+a);
            x=axis.x+d*Math.cos(a);
            y=axis.y+d*Math.sin(a);
            dx=x-ox;
            dy=y-oy;
            console.log('shift '+dx+','+dy);
            move(element,dx,dy);
        }
        else refreshNodes(element); // if not already done after move() or setTransform()
    }
    showDialog('spinDialog',false);
    cancel();
})
getElement('flipButton').addEventListener('click',function() {
    if(type(element)=='dim') return; // cannot flip dimensions
    // console.log('show flip dialog');
    showDialog('flipDialog',true);
});
getElement('flipOptions').addEventListener('click',function() {
    var opt=Math.floor((event.clientX-parseInt(getElement('flipDialog').offsetLeft)+5)/32);
    // console.log('click on '+opt); // 0: horizontal; 1: vertical
    var axis={};
    var elNodes=null;
    var el=getElement(selection[0]);
    var box=getBounds(el);
    var minX=box.x;
    var maxX=box.x+box.width;
    var minY=box.y;
    var maxY=box.y+box.height;
    // console.log('first box '+minX+'-'+maxX+'x'+minY+'-'+maxY);
    for(var i=1;i<selection.length;i++) {
        el=getElement(selection[i]);
        box=getBounds(el);
        if(box.x<minX) minX=box.x;
        if((box.x+box.width)>maxX) maxX=box.x+box.width;
        if(box.y<minY) minY=box.y;
        if((box.y+box.height)>maxY) maxY=box.y+box.height;
    }
    // console.log('overall box '+minX+'-'+maxX+'x'+minY+'-'+maxY);
    if(anchor) { // flip around anchor
        axis.x=parseInt(getElement('anchor').getAttribute('x'));
        axis.y=parseInt(getElement('anchor').getAttribute('y'));
    }
    else { // flip in-situ around mid-point
        axis.x=(minX+maxX)/2;
        axis.y=(minY+maxY)/2;
    }
    // console.log('axis: '+axis.x+','+axis.y);
    re('member');
    while(selection.length>0) { // for each selected item...
        elID=selection.shift();
        el=getElement(elID);
        // console.log('flip '+type(el)+' element '+el.id);
        switch (type(el)) {
            case 'line': // reverse x-coord of each point and each node
            case 'shape':
                var points=el.points;
                for(i=0;i<points.length;i++) {
                    if(opt<1) {
                        dx=points[i].x-axis.x;
                        points[i].x=axis.x-dx;
                    }
                    else {
                        dy=points[i].y-axis.y;
                        points[i].y=axis.y-dy;
                    }
                }
                updateGraph(elID,['points',el.getAttribute('points')]);
                refreshNodes(el);
                break;
            case 'box':
                var spin=parseInt(el.getAttribute('spin'));
                if(spin!=0) {
                        spin*=-1;
                        el.setAttribute('spin',spin);
                        setTransform(el);
                        updateGraph(elID['spin',spin]);
                    }
                break;
            case 'oval':
            	if(opt<1) {
            		var dx=Number(el.getAttribute('cx'))-axis.x;
            		x=axis.x-dx
            		el.setAttribute('cx',x);
            	}
            	else {
            		var dy=Number(el.getAttribute('cy'))-axis.y;
            		y=axis.y-dy;
            		el.setAttribute('cy',y);
            	}
                var spin=parseInt(el.getAttribute('spin'));
                if(spin!=0) {
                    spin*=-1;
                    el.setAttribute('spin',spin);
                    setTransform(el);
                    // updateGraph(elID['spin',spin]);
                }
                updateGraph(elID['cx',x,'cy',y,'spin',spin]);
                break;
            case 'arc':
                var d=el.getAttribute('d');
                getArc(d);
                if(opt<1) { // flip left-right
                        dx=arc.cx-axis.x;
                        arc.cx=axis.x-dx;
                        dx=arc.x1-axis.x;
                        arc.x1=axis.x-dx;
                        dx=arc.x2-axis.x;
                        arc.x2=axis.x-dx;
                    }
                else {
                        dy=arc.cy-axis.y;
                        arc.cy=axis.y-dy;
                        dy=arc.y1-axis.y;
                        arc.y1=axis.y-dy;
                        dy=arc.y2-axis.y;
                        arc.y2=axis.y-dy;
                    }
                arc.sweep=(arc.sweep<1)? 1:0;
                updateGraph(elID,['cx',arc.cx,'x1',arc.x1,'x2',arc.x2,'sweep',arc.sweep]);
                d="M"+arc.cx+","+arc.cy+" M"+arc.x1+","+arc.y1+" A"+arc.r+","+arc.r+" 0 "+arc.major+","+arc.sweep+" "+arc.x2+","+arc.y2;
                element.setAttribute('d',d);
                refreshNodes(el);
                break;
            case 'text':
                showDialog('textDialog',false);
                var flip=parseInt(el.getAttribute('flip'));
                if(opt<1) { // flip left-right
                        // console.log('current flip: '+flip);
                        flip^=1; // toggle horizontal flip;
                        dx=parseInt(el.getAttribute('x'))-axis.x;
                        el.setAttribute('x',(axis.x-dx));
                    }
                else { // flip top-bottom
                        flip^=2; // toggle vertical flip
                        dy=parseInt(el.getAttribute('y'))-axis.y;
                        el.setAttribute('y',(axis.y-dy));
                    }
                el.setAttribute('flip',flip);
                setTransform(el);
                updateGraph(elID,['flip',flip]);
                break;
            case 'set':
                var flip=parseInt(el.getAttribute('flip'));
                if(opt<1) { // flip left-right
                        // console.log('current flip: '+flip);
                        flip^=1; // toggle horizontal flip;
                        dx=parseInt(el.getAttribute('ax'))-axis.x;
                        el.setAttribute('ax',(axis.x-dx));
                    }
                else { // flip top-bottom
                        flip^=2; // toggle vertical flip
                        dy=parseInt(el.getAttribute('ay'))-axis.y;
                        el.setAttribute('ay',(axis.y-dy));
                    }
                refreshNodes(el);
                w=parseInt(el.getAttribute('x'));
                h=parseInt(el.getAttribute('y'));
                var hor=flip&1;
                var ver=flip&2;
                var t='translate('+(hor*w)+','+(ver*h/2)+') ';
                t+='scale('+((hor>0)? -1:1)+','+((ver>0)? -1:1)+')';
                el.setAttribute('flip',flip);
                el.setAttribute('transform',t);
                updateGraph(elID,['flip',flip]);
                break;
        }
    }
    cancel();
    if(anchor) {
        getElement('blue').removeChild(getElement('anchor'));
        anchor=false;
    }
    showDialog('flipDialog',false);
});
getElement('alignButton').addEventListener('click',function() {
    showDialog('alignDialog',true);
});
getElement('alignOptions').addEventListener('click',function() {
    x0=parseInt(getElement('alignDialog').offsetLeft)+parseInt(getElement('alignOptions').offsetLeft);
    y0=parseInt(getElement('alignDialog').offsetTop)+parseInt(getElement('alignOptions').offsetTop);
    // console.log('alignOptions at '+x0+','+y0);
    x=Math.floor((event.clientX-x0+5)/32); // 0-2
    y=Math.floor((event.clientY-y0+5)/32); // 0 or 1
    // console.log('x: '+x+' y: '+y);
    var opt=y*3+x; // 0-5
    // console.log('option '+opt);
    var el=getElement(selection[0]);
    var box=getBounds(el);
    var minX=box.x;
    var maxX=box.x+box.width;
    var minY=box.y;
    var maxY=box.y+box.height;
    // console.log('first box '+minX+'-'+maxX+'x'+minY+'-'+maxY);
    for(var i=1;i<selection.length;i++) {
        el=getElement(selection[i]);
        box=getBounds(el);
        if(box.x<minX) minX=box.x;
        if((box.x+box.width)>maxX) maxX=box.x+box.width;
        if(box.y<minY) minY=box.y;
        if((box.y+box.height)>maxY) maxY=box.y+box.height;
    }
    var midX=(minX+maxX)/2;
    var midY=(minY+maxY)/2;
    // console.log('overall box '+minX+'-'+maxX+'x'+minY+'-'+maxY);
    re('member');
    for(i=0;i<selection.length;i++) {
        el=getElement(selection[i]);
        box=getBounds(el);
        // console.log('move '+el.id+'?');
        switch(opt) {
            case 0: // align left
                if(box.x>minX) move(el,(minX-box.x),0);
                break;
            case 1: // align centre left-right
                x=Number(box.x)+Number(box.width)/2;
                if(x!=midX) move(el,(midX-x),0); 
                break;
            case 2: // align right
                x=Number(box.x)+Number(box.width);
                if(x<maxX) move(el,(maxX-x),0);
                break;
            case 3: // align top
                if(box.y>minY) move(el,0,(minY-box.y));
                break;
            case 4: // align centre top-bottom
                y=Number(box.y)+Number(box.height)/2;
                if(y!=midY) move(el,0,(midY-y));
                break;
            case 5: // align bottom
                // console.log('align bottom');
                y=Number(box.y)+Number(box.height);
                if(y<maxY) move(el,0,(maxY-y));
        }
    }
    showDialog('alignDialog',false);
    cancel();
});
getElement('copyButton').addEventListener('click',function() {
	// console.log('copy '+selection.length+' elements');
	for(var i=0;i<selection.length;i++) {
		element=getElement(selection[i]);
		var g={};
		g.type=type(element);
		g.layer=layer;
		if(g.type!='set') { // sets don't have style
                g.stroke=element.getAttribute('stroke');
                g.lineW=element.getAttribute('stroke-width');
                g.lineType=getLineType(element);
                if(element.getAttribute('stroke-linecap')=='round') graph.lineStyle='round';
    			else g.lineStyle='square';
                var val=element.getAttribute('fill');
                if(val.startsWith('url')) {
                	var p=getElement('pattern'+element.id);
                	g.fillType='pattern'+p.getAttribute('index');
                	g.fill=p.firstChild.getAttribute('fill');
                }
                else {
                	g.fillType=(val=='none')?'none':'solid';
                	g.fill=val;
                }
                // console.log('copy fillType: '+g.fillType+'; fill: '+g.fill);
                var val=element.getAttribute('fill-opacity');
                if(val) g.opacity=val;
            }
            g.spin=element.getAttribute('spin');
            switch(g.type) {
            	case 'curve':
            		// console.log(element.points.length+' points to copy');
            		g.points=[]; // array of points
	        		for(var j=0;j<element.points.length;j++) g.points.push({x:element.points[j].x,y:element.points[j].y});
                    // console.log('first point: '+g.points[0].x+','+g.points[0].y);
            		break;
                case 'line':
                    g.points='';
                    for(var p=0;p<element.points.length;p++) {
                        g.points+=element.points[p].x+','+element.points[p].y+' ';
                    }
                    // console.log('points: '+g.points);
                    break;
                case 'box':
                    g.x=Number(element.getAttribute('x'));
                    g.y=Number(element.getAttribute('y'));
                    g.width=Number(element.getAttribute('width'));
                    g.height=Number(element.getAttribute('height'));
                    g.radius=Number(element.getAttribute('rx'));
                    // console.log('copy '+g.type+' at '+g.x+','+g.y);
                    break;
                case 'oval':
                    g.cx=Number(element.getAttribute('cx'));
                    g.cy=Number(element.getAttribute('cy'));
                    g.rx=Number(element.getAttribute('rx'));
                    g.ry=Number(element.getAttribute('ry'));
                    // console.log('copy '+g.type+' at '+g.cx+','+g.cy);
                    break;
                case 'arc':
                    var d=element.getAttribute('d');
                    getArc(d);
                    g.cx=arc.cx;
                    g.cy=arc.cy;
                    g.x1=arc.x1;
                    g.y1=arc.y1;
                    g.x2=arc.x2;
                    g.y2=arc.y2;
                    g.r=arc.r;
                    g.major=arc.major;
                    g.sweep=arc.sweep;
                    // console.log('copy '+g.type+' at '+g.cx+','+g.cy);
                    break;
                case 'text':
                    g.x=Number(element.getAttribute('x'));
                    g.y=Number(element.getAttribute('y'));
                    g.flip=Number(element.getAttribute('flip'));
                    g.text=element.getAttribute('text');
                    g.textSize=Number(element.getAttribute('font-size'));
                    var style=element.getAttribute('font-style');
                    g.textStyle=(style=='italic')?'italic':'fine';
                    if(element.getAttribute('font-weight')=='bold') g.textStyle='bold';
                    break;
                case 'stamp':
                    g.x=Number(element.getAttribute('x'));
                    g.y=Number(element.getAttribute('y'));
                    g.flip=Number(element.getAttribute('flip'));
                    g.name=element.getAttribute('href').substr(1); // strip off leading #
                    break;
            }
            addGraph(g);
	}
	mode='move';
});
getElement('doubleButton').addEventListener('click',function() {
    // console.log(selection.length+' elements selected: '+elID);
    if(selection.length!=1) return; // can only double single selected...
    var t=type(element); // ...line, shape, box, oval or arc elements
    if((t=='text')||(t=='dim')||(t=='set')||(t=='anchor')) return;
    showDialog('doubleDialog',true);
});
getElement('confirmDouble').addEventListener('click',function() {
    // console.log('DOUBLE');
    var d=getValue('offset'); // parseInt(getElement('offset').value);
    // console.log('double offset: '+d+'mm');
    showDialog('doubleDialog',false);
    var graph={}; // initiate new element
    graph.type=type(element);
    graph.layer=layer;
    switch(graph.type) {
        case 'line':
            var points=element.points;
            var count=points.length;
            var pts=[count]; // points in new line
            var i=0; // counter
            for(i=0;i<count;i++) {
                pts[i]=new Point();
                // console.log('pt '+i+': '+pts[i].x+','+pts[i].y);
            }
            var p=new Point(); // current point
            var p1=new Point(); // next point
            var a=null; // slope of current and...
            var a0=null; // ...previous segment
            var b=null; // y-offset for current and...
            var b0=null; // ...previous segment
            var n=null; // normal to current line segment
            i=0;
            while(i<count-1) {
                a=b=null;
                p.x=points[i].x;
                p.y=points[i].y;
                p1.x=points[i+1].x;
                p1.y=points[i+1].y;
                // console.log('segment '+i+' '+p.x+','+p.y+' to '+p1.x+','+p1.y);
                if(p.x==p1.x) { // vertical
                	console.log('vertical');
                    a='v';
                    if((p1.y-p.y)>0) pts[i].x=pts[i+1].x=p.x-d;
                    else pts[i].x=pts[i+1].x=p.x+d;
                    if(i<1) pts[0].y=p.y; // start point
                }
                else if(p.y==p1.y) { // horizontal
                	console.log('horizontal');
                    a='h';
                    if((p1.x-p.x)>0) pts[i].y=pts[i+1].y=p.y+d;
                    else pts[i].y=pts[i+1].y=p.y-d;
                    if(i<1) pts[0].x=p.x; // start point
                }
                else { // sloping
                	console.log('sloping');
                    a=((p1.y-p.y)/(p1.x-p.x)); // slope of line (dy/dx)
                    n=Math.atan((p1.x-p.x)/(p1.y-p.y)); // angle of normal to line
                    // console.log('line slope: '+a+'; normal: '+(180*n/Math.PI));
                    if(p1.y>=p.y) {
                        p.x-=d*Math.cos(n);
                        p.y+=d*Math.sin(n);
                    }
                    else {
                        p.x+=d*Math.cos(n);
                        p.y-=d*Math.sin(n);
                    }
                    b=p.y-a*p.x;
                    console.log('new segment function: y='+a+'.x+'+b);
                    if(i<1) {
                        pts[0].x=p.x;
                        pts[0].y=p.y;
                    }
                    else { // fix previous point
                        if(a0=='v') pts[i].y=a*pts[i].x+b; // previous segment was vertical - x already set
                        else if(a0=='h') pts[i].x=(pts[i].y-b)/a; // previous segment was horizontal - y set
                        else { // previous segment was sloping
                            pts[i].x=(b-b0)/(a0-a);
                            pts[i].y=a*pts[i].x+b;
                        }
                    }
                }
                a0=a; // remember function values for segment
                b0=b;
                i++;
            }
            // end point...
            console.log('end point is point '+i+' '+p1.x+','+p1.y);
            if(a0=='h') { // last segment horizontal
                pts[i].x=p1.x;
                if(p1.x>p.x) pts[1].y=p1.y+d;
                else pts[i].y=p1.y-d;
            }
            else if(a0=='v') { // last segment vertical
            	if(p1.y>p.y) pts[1].x=p1.x-d;
                else pts[i].x=p1.x+d;
                pts[i].y=p1.y;
            }
            else { // last segment sloping
                if(p1.y>=p.y) {
                    p1.x-=d*Math.cos(n);
                    p1.y+=d*Math.sin(n);
                }
                else {
                    p1.x+=d*Math.cos(n);
                    p1.y-=d*Math.sin(n);
                }
                pts[i].x=p1.x;
                pts[i].y=p1.y;
            }
            graph.points='';
            for(i=0;i<count;i++) {
                // console.log('point '+i+': '+pts[i].x+','+pts[i].y);
                graph.points+=pts[i].x+','+pts[i].y+' ';
            }
            graph.spin=element.getAttribute('spin');
            break;
        case 'shape':
            var points=element.points;
            var count=points.length; // eg. 3-point shape (triangle) has 3 sides
            var pts=[count]; // points in new line
            var i=0; // counter
            for(i=0;i<count;i++) {
                pts[i]=new Point();
                // console.log('pt '+i+': '+pts[i].x+','+pts[i].y); // JUST CHECKING
            }
            var p=new Point(); // current point
            var p1=new Point(); // next point
            var a=null; // slope of current and...
            var a0=null; // ...previous side
            var b=null; // y-offset for current and...
            var b0=null; // ...previous side
            var n=null; // normal to current line side
            i=0;
            while(i<=count) {
                a=b=null;
                // console.log(' point '+i+' ie: '+i%count);
                p.x=points[i%count].x;
                p.y=points[i%count].y;
                p1.x=points[(i+1)%count].x;
                p1.y=points[(i+1)%count].y;
                // console.log('side '+i+' '+p.x+','+p.y+' to '+p1.x+','+p1.y);
                if(p.x==p1.x) { // vertical
                    a='v';
                    if(p1.y>p.y) pts[i%count].x=pts[(i+1)%count].x=p.x-d;
                    else pts[i%count].x=pts[(i+1)%count].x=p.x+d;
                    if(i>0) {
                        if(a0=='v') pts[i%count].y=p.y; // continues previous segment
                        else if(a0=='h') pts[i%count].y=pts[(i-1)%count].y; // previous side was horizontal
                        else pts[i%count].y=a0*pts[i%count].x+b0; // previous side was sloping
                    }
                }
                else if(p.y==p1.y) { // horizontal
                    a='h';
                    if(p1.x>p.x) pts[i%count].y=pts[(i+1)%count].y=p.y+d;
                    else pts[i%count].y=pts[(i+1)%count].y=p.y-d;
                    if(i>0) {
                        if(a0=='h') pts[i%count].x=p.x; // continues previous segment
                        else if(a0=='v') pts[i%count].x=pts[(i-1)%count].x; // previous segment was vertical
                        else pts[i%count].x=(pts[i%count].y-b0)/a0; // previous side was sloping
                    }
                }
                else { // sloping
                    a=((p1.y-p.y)/(p1.x-p.x)); // slope of line (dy/dx)
                    n=Math.atan((p1.x-p.x)/(p1.y-p.y)); // angle of normal to line
                    // console.log('line slope: '+a+'; normal: '+(180*n/Math.PI));
                    if(p1.y>=p.y) {
                        p.x-=d*Math.cos(n);
                        p.y+=d*Math.sin(n);
                    }
                    else {
                        p.x+=d*Math.cos(n);
                        p.y-=d*Math.sin(n);
                    }
                    b=p.y-a*p.x;
                    // console.log('new segment function: y='+a+'.x+'+b);
                    if(i>0) { // fix previous point
                        // console.log('fix previous point - a0 is '+a0);
                        if(a0=='v') pts[i%count].y=a*pts[i%count].x+b; // previous side was vertical - x already set
                        else if(a0=='h') pts[i%count].x=(pts[i%count].y-b)/a; // previous side was horizontal - y set
                        else if(a0==a) { // continues slope of previous segment
                            pts[i%count].x=p.x;
                            pts[i%count].y=p.y;
                        }
                        else { // previous side was sloping
                            // console.log('fix point '+i+' a:'+a+' a0:'+a0+' b:'+b+' b0:'+b0);
                            pts[i%count].x=(b-b0)/(a0-a);
                            pts[i%count].y=a*pts[i%count].x+b;
                        }
                    }
                }
                a0=a; // remember function values for segment
                b0=b;
                i++;
            }
            graph.points='';
            for(i=0;i<count;i++) {
                // console.log('point '+i+': '+pts[i].x+','+pts[i].y);
                graph.points+=pts[i].x+','+pts[i].y+' ';
            }
            graph.spin=element.getAttribute('spin');
            break;
        case 'box':
            x=Number(element.getAttribute('x'));
            y=Number(element.getAttribute('y'));
            w=Number(element.getAttribute('width'));
            h=Number(element.getAttribute('height'));
            if((d<0)&&((w+2*d<1)||(h+2*d<1))) {
                alert('cannot fit inside');
                return;
            }
            graph.x=x-d;
            graph.y=y-d;
            graph.spin=element.getAttribute('spin');
            graph.width=w+2*d;
            graph.height=h+2*d;
            var n=parseInt(element.getAttribute('rx'));
            // console.log('corner radius: '+n);
            if(n!=0) n+=d;
            if(n<0) n=0;
            graph.radius=n;
            graph.layer=layer;
            // console.log('double as '+n);
            break;
        case 'oval':
            x=parseInt(element.getAttribute('cx'));
            y=parseInt(element.getAttribute('cy'));
            var rx=parseInt(element.getAttribute('rx'));
            var ry=parseInt(element.getAttribute('ry'));
            if((d<0)&&((rx+d)<1)||((ry+d)<1)) {
                alert('cannot fit inside');
                return;
            }
            graph.cx=x;
            graph.cy=y;
            graph.rx=rx+d;
            graph.ry=ry+d;
            graph.spin=element.getAttribute('spin');
            break;
        case 'arc':
            var d=element.getAttribute('d');
            getArc(d);
            var r=arc.r+d; // new arc radius
            if(r<0) {
                alert('cannot fit inside');
                return;
            }
            graph.r=r;
            r/=arc.r; // ratio of new/old radii
            graph.cx=arc.cx; // same centre point
            graph.cy=arc.cy;
            dx=arc.x1-arc.cx; // calculate new start point
            dy=arc.y1-arc.cy;
            dx*=r;
            dy*=r;
            graph.x1=arc.cx+dx;
            graph.y1=arc.cy+dy;
            dx=arc.x2-arc.cx; // calculate new end point
            dy=arc.y2-arc.cy;
            dx*=r;
            dy*=r;
            graph.x2=arc.cx+dx;
            graph.y2=arc.cy+dy;
            graph.major=arc.major;
            graph.sweep=arc.sweep;
            graph.spin=arc.spin;
    }
    graph.stroke=element.getAttribute('stroke');
    graph.lineW=element.getAttribute('stroke-width');
    if(element.getAttribute('stroke-linecap')=='round') graph.lineStyle='round';
    else graph.lineStyle='square';
    graph.lineStyle=element.getAttribute('')
    graph.lineType=getLineType(element);
    graph.fillType=element.getAttribute('fillType');
    graph.fill=element.getAttribute('fill');
    n=element.getAttribute('fill-opacity');
    if(n) graph.opacity=n;
    addGraph(graph);
    cancel();
});
getElement('repeatButton').addEventListener('click',function() {
    if(type(element)=='dim') return; // cannot move dimensions
    showDialog('textDialog',false);
    showDialog('repeatDialog',true);
});
getElement('confirmRepeat').addEventListener('click',function() {
    var nH=getValue('countH');
    var nV=getValue('countV');
    var dH=getValue('distH');
    var dV=getValue('distV');
    // console.log(nH+' copies across at '+dH+'mm; '+nV+' copies down at '+dV+'mm');
    var graphs=db.transaction('graphs','readwrite').objectStore('graphs');
    showDialog('repeatDialog',false);
    cancel();
});
getElement('filletButton').addEventListener('click',function() {
    if(type(element!='box')) return; // can only fillet box corners
    getElement('filletR').value=parseInt(element.getAttribute('rx'));
    showDialog('filletDialog',true);
});
getElement('confirmFillet').addEventListener('click',function() {
    re('member');
    var r=parseInt(getElement('filletR').value);
    element.setAttribute('rx',r);
    updateGraph(elID,['radius',r]);
    showDialog('filletDialog',false);
    showInfo(false);
    cancel();
});
getElement('anchorButton').addEventListener('click',function() {
    mode='anchor';
    hint('ANCHOR: tap a node');
});
getElement('joinButton').addEventListener('click',function() {
    getElement('setName').value='';
    if((selection.length>1)&&anchor) showDialog('joinDialog',true);
    else alert('Please place an anchor for the set');
});
getElement('confirmJoin').addEventListener('click',function() {
    var name=getElement('setName').value;
    if(!name) {
        alert('Enter a name for the set');
        return;
    }
    var ax=parseInt(getElement('anchor').getAttribute('x'));
    var ay=parseInt(getElement('anchor').getAttribute('y'));
    var json='{"name":"'+name+'","svg":"';
    // console.log('preliminary JSON: '+json+' anchor at '+ax+','+ay);
    // sort selected elements in order drawn
    var elements=getElement('dwg').children;
    // console.log(elements.length+' elements'+elements);
    var set=[];
    for(var i=0;i<elements.length;i++) {
    	if(selection.includes(elements[i].id)) set.push(elements[i]);
    }
    // console.log('set of elements: '+set);
    for(i=0;i<set.length;i++) {
        el=set[i];
        var t=type(el);
        // console.log('add '+t+' element?');
        if((t=='dim')||(t=='set')) continue; // don't include dimensions or sets
        switch(type(el)) {
            case 'line':
                var points=el.points;
                // console.log('line points: '+points);
                var pts='';
                for(var j=0;j<points.length;j++) {
                	var point=points.getItem(j);
                	pts+=(point.x-ax)+','+(point.y-ay)+' ';
                }
                json+="<polyline points=\'"+pts+"\' spin=\'"+el.getAttribute('spin')+"\' ";
                break;
            case 'shape':
                var points=el.points;
                var pts='';
                for(var j=0;j<points.length;j++) pts+=(points[i].x-ax)+','+(points[i].y-ay)+' ';
                json+="<polygon points=\'"+pts+"\' spin=\'"+el.getAttribute('spin')+"\' ";
                break;
            case 'box':
                json+="<rect x=\'"+(parseInt(el.getAttribute('x'))-ax)+"\' y=\'"+(parseInt(el.getAttribute('y'))-ay)+"\' ";
                json+="width=\'"+el.getAttribute('width')+"\' height=\'"+el.getAttribute('height')+"\' rx=\'"+el.getAttribute('rx')+"\' spin=\'"+el.getAttribute('spin')+"\' ";
                break;
            case 'oval':
                json+="<ellipse cx=\'"+(parseInt(el.getAttribute('cx'))-ax)+"\' cy=\'"+(parseInt(el.getAttribute('cy'))-ay)+"\' ";
                json+="rx=\'"+el.getAttribute('rx')+"\' ry=\'"+el.getAttribute('ry')+"\' spin=\'"+el.getAttribute('spin')+"\' ";
                break;
            case 'arc':
                var d=el.getAttribute('d');
                getArc(d);
                arc.cx-=ax;
                arc.cy-=ay;
                arc.x1-=ax;
                arc.y1-=ay;
                arc.x2-=ax;
                arc.y2-=ay;
                d='M'+arc.cx+','+arc.cy+' M'+arc.x1+','+arc.y1+' A'+arc.r+','+arc.r+' 0 '+arc.major+','+arc.sweep+' '+arc.x2+','+arc.y2;
                json+="<path d=\'"+d+"\' spin=\'"+el.getAttribute('spin')+"\' ";
                break;
            case 'text': // +','+
            	// console.log('x,y is '+el.getAttribute('x')+','+el.getAttribute('y'));
                json+="<text x=\'"+(parseInt(el.getAttribute('x'))-ax)+"\' y=\'"+(parseInt(el.getAttribute('y'))-ay)+"\' ";
                // console.log('json so far '+json);
                json+="spin=\'"+el.getAttribute('spin')+"\' flip=\'"+el.getAttribute('flip')+"\' ";
                json+="stroke=\'"+el.getAttribute('stroke')+"\' fill=\'"+el.getAttribute('fill')+"\' ";
                json+="font-family=\'"+el.getAttribute('font-family')+"\' font-style=\'"+el.getAttribute('font-style')+"\' ";
                json+="font-size=\'"+el.getAttribute('font-size')+"\' font-weight=\'"+el.getAttribute('font-weight')+"\' ";
                json+="text=\'"+el.getAttribute('text')+"\'";
                json+=">"+el.getAttribute('text')+"</text>";
        }
        if(t!='text') { // set style and complete svg
            json+="stroke=\'"+el.getAttribute('stroke')+"\' stroke-width=\'"+el.getAttribute('stroke-width')+"\' ";
            var val=el.getAttribute('stroke-dasharray');
            if(val) json+="stroke-dasharray=\'"+val+"\' ";
            json+="fill=\'"+el.getAttribute('fill')+"\' ";
            val=el.getAttribute('fill-opacity');
            if(val) json+="fill-opacity=\'"+val+"\'";
            json+="/>";
        }
        // console.log('JSON so far: '+json);
    }
    json+='"}';
    // console.log('save set JSON: '+json);
    addSet(json);
    showDialog('joinDialog',false);
});
getElement('returnButton').addEventListener('click',cancel);
// STYLES
getElement('line').addEventListener('click',function() {
    showDialog('stylesDialog',true);
});
getElement('lineType').addEventListener('change',function() {
    var linetype=event.target.value;
    if(selection.length>0) {
    	for (var i=0;i<selection.length;i++) {
    		// console.log('change line width for selected element '+i);
    		var el=getElement(selection[i]);
    		w=Number(el.getAttribute('stroke-width'));
    		var val=null;
        	switch(linetype) {
            	case 'none':
            	case 'solid':
                	// var val=null;
                	break;
            	case 'dashed':
                	val=(4*w)+' '+(4*w);
                	break;
            	case 'dotted':
                	val=w+' '+w;
        	}
        	// console.log('set element '+el.id+' line type to '+linetype);
        	el.setAttribute('stroke-dasharray',val);
        	val=el.getAttribute('stroke');
        	el.setAttribute('stroke',(linetype=='none')?'none':val);
        	updateGraph(el.id,['lineType',linetype]);
        	updateGraph(el.id,['stroke',(linetype=='none')?'none':lineColor]);
    	}
    }
    else { // change default line type
        lineType=type;
    }
    getElement('line').style.borderBottomStyle=type;
});
getElement('lineStyle').addEventListener('change',function() {
	var style=event.target.value;
	if(selection.length>0) {
		for(var i=0;i<selection.length;i++) {
			var el=getElement(selection[i]);
			// console.log('set element '+el.id+' line style to '+style);
			updateGraph(el.id,['lineStyle',style]);
			if(style=='round') {
				el.setAttribute('stroke-linecap','round');
				el.setAttribute('stroke-linejoin','round');
			}
			else {
				el.setAttribute('stroke-linecap','butt');
				el.setAttribute('stroke-linejoin','miter');
			}
		}
	}
	else { // change default line style
		lineStyle=style;
	}
})
getElement('penSelect').addEventListener('change',function() {
    var val=event.target.value;
    // NEW CODE...
    if(selection.length>0) {
    	for(var i=0;i<selection.length;i++) {
    		var el=getElement(selection[i]);
    		var lineW=val*scale;
        	el.setAttribute('stroke-width',lineW);
        	if(el.getAttribute('stroke-dasharray')) el.setAttribute('stroke-dasharray',lineW+' '+lineW);
        	updateGraph(el.id,['lineW',lineW]);
    	}
    }
    else { // change default pen width
        pen=val;
    }
    getElement('line').style.borderWidth=(pen/scaleF)+'px';
});
getElement('textSize').addEventListener('change',function() {
    var val=event.target.value;
    // console.log('set text size for '+selection.length+' items');
    if(selection.length>0) {
    	for(var i=0;i<selection.length;i++) {
    		var el=getElement(selection[i]);
    		if(type(el)=='text') {
            	el.setAttribute('font-size',val*scale);
            	updateGraph(el.id,['textSize',val]);
        	}
    	}
    }
    textSize=val; // change default text size
});
getElement('textFont').addEventListener('change',function() {
	var val=event.target.value;
    // console.log('set text font to '+val+' for '+selection.length+' items');
    if(selection.length>0) {
    	for(var i=0;i<selection.length;i++) {
    		var el=getElement(selection[i]);
    		if(type(el)=='text') {
            	el.setAttribute('font-family',val);
            	updateGraph(el.id,['textFont',val]);
        	}
    	}
    }
    else textFont=val; // change default text font
    getElement('textFont').value=val;
});
getElement('textStyle').addEventListener('change',function() {
    var val=event.target.value;
    if(selection.length>0) {
    	for(var i=0;i<selection.length;i++) {
    		var el=getElement(selection[i]);
    		 if(type(el)=='text') {
            	switch(val) {
                	case 'fine':
                    	el.setAttribute('font-style','normal');
                    	el.setAttribute('font-weight','normal');
                    	break;
                	case 'bold':
                    	el.setAttribute('font-style','normal');
                    	el.setAttribute('font-weight','bold');
                    	break;
                	case 'italic':
                    	el.setAttribute('font-style','italic');
                    	el.setAttribute('font-weight','normal');
            	}
            	updateGraph(el.id,['textStyle',val]);
        	}
    	}
    }
    else { // change default text style
        textStyle=val;
    }
});
getElement('lineColor').addEventListener('click',function() {
    getElement('colorPicker').mode='line';
    showColorPicker(true,event.clientX-16,event.clientY-16);
});
getElement('fillType').addEventListener('change',function() {
    var filltype=event.target.value;
    // console.log('fill type: '+filltype);
    if(selection.length>0) {
    	var col=getElement('fillColor').value;
    	for (var i=0;i<selection.length;i++) {
    		// console.log('change fill type for selected element '+i);
    		var el=getElement(selection[i]);
    		if(filltype=='pattern') {
    			showDialog('patternMenu',true);
    			return;
    		}
    		else { // solid or no fill
    			var ptn=getElement('pattern'+el.id); // attempt removal of any associated pattern
    			// var fill=ptn.firstChild.getAttribute('fill');
    			if(ptn) ptn.remove();
	        	el.setAttribute('fill',(filltype=='none')?'none':fillColor);
    		}
    		if(filltype=='none') fill='none';
    		el.setAttribute('fillType',filltype);
    		el.setAttribute('fill',fill);
        	updateGraph(el.id,['fillType',filltype,'fill',fill]);
    	}
    }
    else { // change default fillType type
        fillType=type;
    }
    getElement('fill').style.background=(type=='none')?'none':fillColor;
});
getElement('fillColor').addEventListener('click',function() {
	// console.log('show colour menu');
	getElement('colorPicker').style.display='block';
	getElement('colorPicker').mode='fill';
	var color=showColorPicker(true,event.clientX-16,event.clientY-16);
});
getElement('opacity').addEventListener('change',function() {
    var val=event.target.value;
    if(selection.length>0) {
    	for(var i=0;i<selection.length;i++) {
    		var el=getElement(selection[i]);
    		el.setAttribute('stroke-opacity',val);
    		el.setAttribute('fill-opacity',val);
        	updateGraph(el.id,['opacity',val]);
    	}
    }
    else opacity=val; // change default opacity
    getElement('fill').style.opacity=val;
});
getElement('blur').addEventListener('change',function() {
    var val=event.target.value;
    // console.log('blur: '+val);
    if(selection.length>0) {
    	var col=getElement('fillColor').value;
    	for (var i=0;i<selection.length;i++) {
    		// console.log('change blur for selected element '+i);
    		var el=getElement(selection[i]);
    		if(val>0) el.setAttribute('filter','url(#blur'+val+')');
        	else el.setAttribute('filter','none');
        	updateGraph(el.id,['blur',val]);
    	}
    }
    else blur=val; // change default blur
});
getElement('patternOption').addEventListener('click',function() {
	// console.log('click "pattern" - fill is '+element.getAttribute('fill'));
	if(element && element.getAttribute('fill').startsWith('url')) showDialog('patternMenu',true);
});
getElement('patternMenu').addEventListener('click',function(event) {
	x=Math.floor((event.clientX-53)/30); // column 0-4
	y=Math.floor((event.clientY-52)/30); // row 0-2
	var n=y*5+x; // 5 per row - n is 0-14
	var fill=element.getAttribute('fill'); // fill colour/pattern
	// console.log('set element fill (currently '+fill+') to pattern'+n);
	if(fill.startsWith('url')) { // amend pattern choice
		var p=getElement('pattern'+element.id);
		var color=pattern.firstChild.getAttribute('fill');
		p.setAttribute('index',n);
		p.setAttribute('width',pattern[n].width);
		p.setAttribute('height',pattern[n].height);
		p.innerHTML=tile[pattern[n].tile];
		p.firstChild.setAttribute('fill',color);
		updateGraph(element.id,['fillType','pattern'+n]);
	}
	else { // set fill to pattern
		// console.log('set pattern for element '+element.id);
		// console.log(' pattern '+n+' size: '+pattern[n].width+'x'+pattern[n].height);
		var html="<pattern id='pattern"+element.id+"' index='"+n+"' width='"+pattern[n].width+"' height='"+pattern[n].height+"' patternUnits='userSpaceOnUse'";
		if((scale>1)||(pattern[n].spin!=0)) { // set transform
			html+=" patternTransform='";
			if(scale>1) html+="scale("+scale+")";
			if(pattern[n].spin!=0) html+=" rotate("+pattern[n].spin+")";
			html+="'";
		}
		html+="'>"+tile[pattern[n].tile]+'</pattern>';
		// console.log('pattern HTML: '+html);
		getElement('defs').innerHTML+=html;
		var el=getElement('pattern'+element.id);
		getElement('pattern'+element.id).firstChild.setAttribute('fill',fill);
		getElement('pattern'+element.id).lastChild.setAttribute('fill',fill);
		element.setAttribute('fillType','pattern');
		element.setAttribute('fill','url(#pattern'+element.id+')');
		updateGraph(element.id,['fillType','pattern'+n]);
	}
});
getElement('colorPicker').addEventListener('click',function(e) {
	var val=e.target.id;
	showColorPicker(false);
	if(getElement('colorPicker').mode=='line') { // line colour
        // if(val=='white') val='blue';
        if(selection.length>0) { // change line shade of selected elements
        	for(var i=0;i<selection.length;i++) {
        		var el=getElement(selection[i]);
        		if(type(el)=='text') {
        			el.setAttribute('fill',val);
        			updateGraph(el.id,['fill',val]);
        		}
        		else {
        			el.setAttribute('stroke',val);
                	updateGraph(el.id,['stroke',val]);
                	if(val=='blue') { // move element into <ref> layer...
                    	// console.log('blue line - shift to <ref>');
                    	el.setAttribute('stroke-width',0.25*scale); // ...with thin lines...
                    	el.setAttribute('fill','none'); // ...and no fill
                    	// getElement('ref').appendChild(el); // move to <ref> layer ******* INSTEAD PUT ON LAYER 0 *******
                    	remove(el.id,true); // remove from database keeping nodes for snap
                    	for(var j=0;j<dims.length;j++) { // ...and remove any linked dimensions
                        	if((Math.floor(dims[j].n1/10)==Number(el.id))||(Math.floor(dims[j].n2/10)==Number(el.id))) {
                            	remove(dims[j].dim);
                            	dims.splice(j,1);
                        	}
                    	}
                    	cancel();
                	}
        		}
        	}
        }
        else { // change default line colour
            // console.log('line colour: '+val);
            if(val=='white') val='black'; // cannot have white lines
            lineColor=val;
        }
        getElement('line').style.borderColor=val;
        getElement('lineColor').style.backgroundColor=val;
    }
    else { // fill colour
    	if(selection.length>0) { // change line shade of selected elements
    		for (var i=0;i<selection.length;i++) {
    			// console.log('change fill colour for selected element '+i);
    			var el=getElement(selection[i]);
    			if(type(el)=='text') continue; // text fill colour uses line colour
    			var fill=getElement('fillType').value;
        		if(fill=='pattern') { // change colour of one or two elements in pattern tile
        			getElement('pattern'+element.id).firstChild.setAttribute('fill',val);
        			getElement('pattern'+element.id).lastChild.setAttribute('fill',val);
        		}
        		else el.setAttribute('fill',(fill=='solid')?val:'none');
        		updateGraph(el.id,['fill',val]);
    		}
    	}
        else {fillColor=val;} // change default fill shade
        getElement('fill').style.background=val;
        getElement('fillColor').style.backgroundColor=val;
    }
});
// POINTER ACTIONS
getElement('graphic').addEventListener('pointerdown',function(e) {
    // console.log('pointer down - mode is '+mode);
    re('wind');
    event.preventDefault();
    if(currentDialog) showDialog(currentDialog,false); // clicking drawing removes any dialogs/menus
    getElement('colorPicker').style.display='none';
    scr.x=Math.round(event.clientX);
    scr.y=Math.round(event.clientY);
    x=x0=Math.round(scr.x*scaleF/zoom+dwg.x);
    y=y0=Math.round(scr.y*scaleF/zoom+dwg.y);
    // ADJUST FOR RESOLUTION AT SCALE - 1mm up to 1:10, 5mm at 1:20, 10mm at 1:50 and 25mm at 1:100
    if(scale>10) { // for scales smaller than 1:10 adjust to nearest 5/10/25mm
    	if(scale==50) res=10;
    	else res=scale/4;
    	x=x0=res*Math.round(x/res);
    	y=y0=res*Math.round(y/res);
    	// console.log('x0,y0 resolved to '+x+','+y);
    }
    var val=event.target.id;
    // console.log('zoom: '+zoom+'; dwg.x: '+dwg.x);
    console.log('tap on '+scr.x+','+scr.y+'px - '+val+' x,y:'+x+','+y+' x0,y0: '+x0+','+y0);
    if(val=='anchor')  { // move selected elements using anchor
        mode='move';
        hint('drag ANCHOR to MOVE selection');
        re('member');
    }
    var holder=event.target.parentNode.id;
    // console.log('holder is '+holder);
    if((holder=='selection')&&(mode!='anchor')) { // click on a blue box to move multiple selectin
        // console.log('move group selection');
        mode='move';
        hint('drag to MOVE selection');
        re('member');
    }
    else if(holder=='handles') { // handle
        // console.log('HANDLE '+val);
        var handle=getElement(val);
        var bounds=getBounds(element);
        // console.log('bounds for element '+element.id+': '+bounds.x+','+bounds.y+' '+bounds.width+'x'+bounds.height);
        getElement('blueBox').setAttribute('x',bounds.x);
        getElement('blueBox').setAttribute('y',bounds.y);
        getElement('blueBox').setAttribute('width',bounds.width);
        getElement('blueBox').setAttribute('height',bounds.height);
        console.log('box at '+bounds.x+','+bounds.y);
        getElement('guides').style.display='block';
        re('member');
        if(val.startsWith('mover')) {
            node=parseInt(val.substr(5)); // COULD GO AT START OF HANDLES SECTION
            x=parseFloat(handle.getAttribute('x'));
            y=parseFloat(handle.getAttribute('y'));
            console.log('mover at '+x+','+y);
            /* var n=nodes.filter(function(node) { // get nodes for selected element
        		return (Math.floor(node.n/10)==element.id);
    		}); */
    		console.log(elNodes.length+' nodes');
            if(mode=='addPoint') { // add point after start-point
                var points=element.points;
                x=Math.round((Number(points[0].x)+Number(points[1].x))/2);
                y=Math.round((Number(points[0].y)+Number(points[1].y))/2);
                var pts=points[0].x+','+points[0].y+' '+x+','+y+' ';
                for(var i=1;i<points.length;i++) pts+=points[i].x+','+points[i].y+' ';
                element.setAttribute('points',pts);
                updateGraph(elID,['points',pts]);
                refreshNodes(element);
                cancel();
                return;
            }
            else if(mode=='removePoint') {
                showDialog('removeDialog',true);
                return;
            }
            console.log('move using node '+node);
            mode='move';
            hint('drag to MOVE');
            path=null;
            switch(type(element)) {
            	case 'curve':
                    x0=handle.getAttribute('x');
                    y0=handle.getAttribute('y');
                    console.log('nodes...');
                    for(var i=0;i<elNodes.length;i++) console.log('node '+i+': '+elNodes[i].x+','+elNodes[i].y);
                    path='m '+(elNodes[0].x-x)+' '+(elNodes[0].y-y);
                    for(i=1;i<elNodes.length;i++) {
                    	path+=' l '+(elNodes[i].x-elNodes[i-1].x)+' '+(elNodes[i].y-elNodes[i-1].y);
                    }
                    break;
                case 'line':
                case 'shape':
                    // x0=element.points[0].x;
                    // y0=element.points[0].y;
                    path='m '+(elNodes[0].x-x)+' '+(elNodes[0].y-y);
                    for(var i=1;i<elNodes.length;i++) {
                    	path+=' l '+(elNodes[i].x-elNodes[i-1].x)+' '+(elNodes[i].y-elNodes[i-1].y);
                    }
                    // console.log('line path: '+path);
                    break;
                case 'box':
                	// TRY THIS...
                	x0=handle.getAttribute('x');
                    y0=handle.getAttribute('y');
                	// offset.x=x-Number(element.getAttribute('x'));
                	// offset.y=y-Number(element.getAttribute('y'));
                	//
                    path='m '+(elNodes[0].x-x)+' '+(elNodes[0].y-y)+' l '+(elNodes[2].x-elNodes[0].x)+' '+(elNodes[2].y-elNodes[0].y);
                    path+=' l '+(elNodes[8].x-elNodes[2].x)+' '+(elNodes[8].y-elNodes[2].y);
                    path+=' l '+(elNodes[6].x-elNodes[8].x)+' '+(elNodes[6].y-elNodes[8].y);
                    path+=' l '+(elNodes[0].x-elNodes[6].x)+' '+(elNodes[0].y-elNodes[6].y);
                    // console.log('box path: '+path);
                    break;
                case 'oval':
                    x0=parseInt(element.getAttribute('cx'));
                    y0=parseInt(element.getAttribute('cy'));
                    var rx=parseInt(element.getAttribute('rx'));
        			var ry=parseInt(element.getAttribute('ry'));
                    var spin=parseInt(element.getAttribute('spin')); // degrees
                    path='m '+(elNodes[1].x-x)+' '+(elNodes[1].y-y); // move to node 1...
                    path+=' a '+rx+' '+ry+' '+spin+' 1 1 '+(elNodes[4].x-elNodes[1].x)+' '+(elNodes[4].y-elNodes[1].y); // ...and draw half oval clockwise to node 4...
                    path+=' a '+rx+' '+ry+' '+spin+' 1 1 '+(elNodes[1].x-elNodes[4].x)+' '+(elNodes[1].y-elNodes[4].y); // ...then other half back to noded 1
                    // console.log('oval path: '+path);
                    break;
                case 'arc':
                    x0=parseInt(element.getAttribute('cx'));
                    y0=parseInt(element.getAttribute('cy'));
                    getArc(element.getAttribute('d'));
                    // console.log('arc: a '+arc.r+' '+arc.r+' '+' 0 '+arc.major+' '+arc.sweep+' '+arc.x2+' '+arc.y2);
                    path='m '+(arc.x1-x)+' '+(arc.y1-y); // move to start of x-arc
                    path+=' a '+arc.r+' '+arc.r+' '+' 0 '+arc.major+' '+arc.sweep+' '+(arc.x2-arc.x1)+' '+(arc.y2-arc.y1);
                    // console.log('arc path: '+path);
                    break;
                case 'text':
                    x0=element.getAttribute('x');
                    y0=element.getAttribute('y');
                    var bounds=element.getBBox();
                    offset.x=offset.y=0;
                    break;
                case 'dim':
                    getElement('blueBox').setAttribute('width',0);
                    getElement('blueBox').setAttribute('height',0);
                    mode='dimAdjust';
                    x0=parseInt(element.firstChild.getAttribute('x1'));
                    y0=parseInt(element.firstChild.getAttribute('y1'));
                    dx=parseInt(element.firstChild.getAttribute('x2'))-x0;
                    dy=parseInt(element.firstChild.getAttribute('y2'))-y0;
                    getElement('blueLine').setAttribute('x1',x0);
                    getElement('blueLine').setAttribute('y1',y0);
                    getElement('blueLine').setAttribute('x2',(x0+dx));
                    getElement('blueLine').setAttribute('y2',(y0+dy));
                    var spin=element.getAttribute('transform');
                    getElement('blueLine').setAttribute('transform',spin);
                    getElement('guides').style.display='block';
                    hint('MOVE DIMENSION (UP/DOWN)');
                    break;
                case 'set':
                    x0=element.getAttribute('x');
                    y0=element.getAttribute('y');
                case 'image': // WAS BOX!!
                    x0=element.getAttribute('x');
                    y0=element.getAttribute('y');
                    offset.x=(node<1)?(-w/2):0;
                    offset.y=(node<1)?(-h/2):0;
                    break;
            }
            if(!path) {
            	console.log('offsets: '+offset.x+','+offset.y);
            	getElement('blueBox').setAttribute('x',x+offset.x);
            	getElement('blueBox').setAttribute('y',y+offset.y);
            }
            getElement('guides').style.display='block';
            getElement('graphic').addEventListener('pointermove',drag);
            return;
        }
        else if(val.startsWith('sizer')) {
            node=parseInt(val.substr(5)); // COULD GO AT START OF HANDLES SECTION?
            if(mode=='addPoint') {
                // console.log('add point after point '+node);
                var points=element.points;
                // console.log('point '+node+': '+points[node].x+','+points[node].y);
                var n=points.length-1;
                var pts='';
                if(node==n) { // append point after end-point
                    dx=points[n].x-points[n-1].x;
                    dy=points[n].y-points[n-1].y;
                    x=points[n].x+dx;
                    y=points[n].y+dy;
                    for(var i=0;i<points.length;i++) {
                        pts+=points[i].x+','+points[i].y+' ';
                    }
                    pts+=x+','+y;
                }
                else { // insert point midway between selected point and next point
                    // console.log('add between points '+node+'('+points[node].x+','+points[node].y+') and '+(node+1));
                    x=Math.round((points[node].x+points[node+1].x)/2);
                    y=Math.round((points[node].y+points[node+1].y)/2);
                    var i=0;
                    while(i<points.length) {
                        if(i==node) pts+=points[i].x+','+points[i].y+' '+x+','+y+' ';
                        else pts+=points[i].x+','+points[i].y+' ';
                        // console.log('i: '+i+' pts: '+pts);
                        i++;
                    }
                }
                element.setAttribute('points',pts);
                updateGraph(elID,['points',pts]);
                refreshNodes(element);
                cancel();
                return;
            }
            else if(mode=='removePoint') {
                // console.log('remove point '+node);
                var points=element.points;
                // console.log('point '+node+': '+points[node].x+','+points[node].y);
                var pts='';
                for(var i=0;i<points.length-1;i++) {
                    if(i<node) pts+=points[i].x+','+points[i].y+' ';
                    else pts+=points[i+1].x+','+points[i+1].y+' ';
                }
                element.setAttribute('points',pts);
                updateGraph(elID,['points',pts]);
                refreshNodes(element);
                cancel();
                return;
            }
            else hint('drag to SIZE');
            // console.log('size using node '+node);
            dx=dy=0;
            switch(type(element)) {
            	case 'curve':
                case 'line':
                case 'shape':
                	// console.log('drag sizer for '+type(element))
                    mode='movePoint'+node;
                    var points=element.getAttribute('points');
                    getElement('bluePolyline').setAttribute('points',points);
                    getElement('blueBox').setAttribute('width',0);
                    getElement('blueBox').setAttribute('height',0);
                    getElement('guides').style.display='block';
                    break;
                case 'box':
                    mode='boxSize';
                    break;
                case 'oval':
                    mode='ovalSize';
                    break;
                case 'arc':
                    mode='arcSize';
                    var d=element.getAttribute('d');
                    getArc(d);
                    x0=arc.cx;
                    y0=arc.cy;
                    // console.log('arc centre: '+x0+','+y0+' radius: '+arc.radius);
                    getElement('blueBox').setAttribute('width',0);
                    getElement('blueBox').setAttribute('height',0);
                    getElement('blueOval').setAttribute('cx',x0); // circle for radius
                    getElement('blueOval').setAttribute('cy',y0);
                    getElement('blueOval').setAttribute('rx',arc.r);
                    getElement('blueOval').setAttribute('ry',arc.r);
                    getElement('blueLine').setAttribute('x1',x0); // prepare radius
                    getElement('blueLine').setAttribute('y1',y0);
                    getElement('blueLine').setAttribute('x2',x0);
                    getElement('blueLine').setAttribute('y2',y0);
                    getElement('guides').style.display='block';
                    break;
                case 'image':
                	mode='imageSize';
                	break;
            }
            getElement('graphic').addEventListener('pointermove',drag);
            return;
        }
    }
    snap=snapCheck(); //  JUST DO if(snapCheck())?
    // console.log('SNAP: '+snap);
    if(snap) { // snap start/centre to snap target
        x0=x;
        y0=y;
    }
    // console.log('mode: '+mode);
    switch(mode) {
    	case 'curve':
            blueline=getElement('bluePolyline');
            var point=getElement('svg').createSVGPoint();
            point.x=x;
            point.y=y;
            blueline.points[0]=point;
            getElement('guides').style.display='block';
            // console.log('start point: '+x+','+y+'; points: '+blueline.points);
            break;
        case 'line':
            blueline=getElement('bluePolyline');
            var point=getElement('svg').createSVGPoint();
            point.x=x;
            point.y=y;
            if(blueline.points.length>1) {
                point=blueline.points[blueline.points.length-1];
                x0=point.x;
                y0=point.y;
            }
            else if(blueline.points.length>0) blueline.points[0]=point;
            blueline.points.appendItem(point);
            refreshNodes(blueline); // set blueline nodes to match new point
            getElement('guides').style.display='block';
            hint('LINES: drag to next point; tap twice to end lines or on start to close shape');
            break;
        case 'box':
            getElement('blueBox').setAttribute('x',x0);
            getElement('blueBox').setAttribute('y',y0);
            getElement('guides').style.display='block';
            hint('drag to size');
            break;
        case 'oval':
            getElement('blueOval').setAttribute('cx',x0);
            getElement('blueOval').setAttribute('cy',y0);
            getElement('guides').style.display='block';
            hint('drag to size');
            break;
        case 'arc':
            arc.x1=x0;
            arc.y1=y0;
            hint('ARC: drag to centre');
            getElement('blueLine').setAttribute('x1',arc.x1);
            getElement('blueLine').setAttribute('y1',arc.y1);
            getElement('blueLine').setAttribute('x2',arc.x1);
            getElement('blueLine').setAttribute('y2',arc.y1);
            getElement('guides').style.display='block';
            break;
        case 'text':
            // console.log('show text dialog');
            getElement('text').value='';
            showDialog('textDialog',true);
            mode='writing';
            break;
        case 'writing':
    		if(e.target!=textDialog) // console.log('MISS');
    		cancel();
    		break;
        case 'set':
            // console.log('place set '+setID+' at '+x0+','+y0);
            var graph={};
	        graph.type='set';
            graph.name=setID;
            graph.x=x0;
            graph.y=y0;
            graph.spin=0;
	        graph.flip=0;
	        addGraph(graph);
	        cancel();
            break;
        case 'image':
        	// console.log('show image dialog');
            showDialog('imageDialog',true);
            break;
        case 'select':
        case 'pointEdit':
            getElement('selectionBox').setAttribute('x',x0);
            getElement('selectionBox').setAttribute('y',y0);
            getElement('guides').style.display='block';
            selectionBox.x=x0;
            selectionBox.y=y0;
            selectionBox.w=selectionBox.h=0;
    }
    event.stopPropagation();
    // console.log('exit pointer down code');
    if(mode!='set') getElement('graphic').addEventListener('pointermove',drag);
});
function drag(event) {
    event.preventDefault();
    getElement('datumSet').style.display='block'; // show datum lines while dragging
    scr.x=Math.round(event.clientX);
    scr.y=Math.round(event.clientY);
    x=Math.round(scr.x*scaleF/zoom+dwg.x);
    y=Math.round(scr.y*scaleF/zoom+dwg.y);
    if((Math.abs(x-x0)<snapD)&&(Math.abs(y-y0)<snapD)) return; // ignore tiny drag
    // ADJUST FOR RESOLUTION AT SCALE - 1mm up to 1:10, 5mm at 1:20, 10mm at 1:50 and 25mm at 1:100
    if(scale>10) { // for scales smaller than 1:10 adjust to nearest 5/10/25mm
    	if(scale==50) res=10;
    	else res=scale/4;
    	x=res*Math.round(x/res);
    	y=res*Math.round(y/res);
    	// console.log('x,y resolved to '+x+','+y);
    }
    if(mode!='arcEnd') {
        snap=snapCheck(); // snap to nearby nodes, datum,...
        if(!snap) {
            if(Math.abs(x-x0)<snapD) x=x0; // ...vertical...
            if(Math.abs(y-y0)<snapD) y=y0; // ...or horizontal
        }
    }
    if(mode.startsWith('movePoint')) {
        var n=parseInt(mode.substr(9));
        // console.log('drag polyline point '+n);
        getElement('bluePolyline').points[n].x=x;
        getElement('bluePolyline').points[n].y=y;
    }
    else switch(mode) {
    	case 'curve':
            dx=x-x0;
            dy=y-y0;
            var d=Math.sqrt(dx*dx+dy*dy)*scale;
            if((d>10*scale)&&(blueline.points.length<10)) {
                console.log('add point');
                var point=getElement('svg').createSVGPoint();
                point.x=x;
                point.y=y;
                blueline.points.appendItem(point);
                x0=x;
                y0=y;
                if(blueline.points.length>9) hint('MAXIMUM 10 NODES');
            }
            break;
        case 'move':
            if(selection.length>1) { // move multiple selection
                dx=x-x0;
                dy=y-y0;
                getElement('selection').setAttribute('transform','translate('+dx+','+dy+')');
            }
            else { // drag  single element
            	console.log('move '+type(element));
            	if(path) { // moving curve, line/shape, box, oval or arc
            		var d='M '+Number(x)+' '+Number(y)+path;
            		console.log('bluePath: '+d);
            		getElement('bluePath').setAttribute('d',d);
            	}
            	else { // moving text, dimension, image, set
            		getElement('blueBox').setAttribute('x',Number(x)+Number(offset.x));
               		getElement('blueBox').setAttribute('y',Number(y)+Number(offset.y));
            	}
            }
            if(anchor) {
                getElement('anchor').setAttribute('x',x);
                getElement('anchor').setAttribute('y',y);
            }
            setSizes('polar',null,x0,y0,x,y);
            break;
        case 'boxSize':
            var aspect=w/h;
            dx=x-x0;
            dy=y-y0;
            if(Math.abs(dx)<(snapD*2)) dx=0; // snap to equal width,...
            else if(Math.abs(dy)<(snapD*2)) dy=0; // ...equal height,... 
            else if((w+dx)/(h+dy)>aspect) dy=dx/aspect; // ...or equal proportion
            else dx=dy*aspect;
            x=parseInt(element.getAttribute('x'));
            y=parseInt(element.getAttribute('y'));
            w=parseInt(element.getAttribute('width'));
            h=parseInt(element.getAttribute('height'));
            w+=dx;
            h+=dy;
            getElement('blueBox').setAttribute('width',w);
            getElement('blueBox').setAttribute('height',h);
            setSizes('box',null,w,h);
            break;
        case 'ovalSize':
        	var aspect=w/h;
        	dx=x-x0;
            dy=y-y0;
            if(Math.abs(dx)<(snapD*2)) dx=0; // snap to equal width,...
            else if(Math.abs(dy)<(snapD*2)) dy=0; // ...equal height,... 
            else if((w+dx)/(h+dy)>aspect) dy=dx/aspect; // ...or equal proportion
            else dx=dy*aspect;
            x=parseInt(element.getAttribute('cx')); // centre
            y=parseInt(element.getAttribute('cy'));
            w=parseInt(element.getAttribute('rx'))*2; // overall size
            h=parseInt(element.getAttribute('ry'))*2;
            x-=w/2; // top/left
            y-=h/2;
            x-=dx;
            y-=dy;
            w+=dx*2;
            h+=dy*2;
            getElement('blueBox').setAttribute('x',x);
            getElement('blueBox').setAttribute('y',y);
            getElement('blueBox').setAttribute('width',w);
            getElement('blueBox').setAttribute('height',h);
            setSizes('oval',null,w,h);
            break;
        case 'arcSize':
            dx=x-x0;
            dy=y-y0;
            var r=Math.sqrt((dx*dx)+(dy*dy));
            if(Math.abs(r-arc.r)<snapD) { // change angle but not radius
                getElement('blueLine').setAttribute('x2',x);
                getElement('blueLine').setAttribute('y2',y);
                getElement('blueOval').setAttribute('rx',arc.r);
                getElement('blueOval').setAttribute('ry',arc.r);
                var a=Math.atan(dy/dx); // radians
                a=a*180/Math.PI+90; // 'compass' degrees
                if(dx<0) a+=180;
                getElement('second').value=a; // new angle
            }
            else { // change radius but not angle
                getElement('blueOval').setAttribute('rx',r);
                getElement('blueOval').setAttribute('ry',r);
                getElement('blueLine').setAttribute('x2',x0);
                getElement('blueLine').setAttribute('y2',y0);
                getElement('first').value=r; // new radius
            }
            break;
        case 'imageSize':
        	dx=x-x0;
            dy=y-y0;
        	x=parseInt(element.getAttribute('x'));
            y=parseInt(element.getAttribute('y'));
            w=parseInt(element.getAttribute('width'));
            h=parseInt(element.getAttribute('height'));
            var ratio=h/w; // keep original image proportions
            if(dx>=dy) dy=dx*ratio;
            else dx=dy/ratio;
            w+=dx;
            h+=dy;
            getElement('blueBox').setAttribute('width',w);
            getElement('blueBox').setAttribute('height',h);
            setSizes('image',null,w,h);
        	break;
        case 'pan':
            dx=dwg.x-(x-x0);
            dy=dwg.y-(y-y0);
            getElement('svg').setAttribute('viewBox',dx+' '+dy+' '+(scr.w*scaleF/zoom)+' '+(scr.h*scaleF/zoom));
            getElement('paper').setAttribute('viewBox',dx+' '+dy+' '+(scr.w*scaleF/zoom)+' '+(scr.h*scaleF/zoom));
            break;
        case 'line':
            if(Math.abs(x-x0)<snapD) x=x0; // snap to vertical
            if(Math.abs(y-y0)<snapD) y=y0; // snap to horizontal
            var n=blueline.points.length;
            var point=blueline.points[n-1];
            point.x=x;
            point.y=y;
            blueline.points[n-1]=point;
            setSizes('polar',null,x0,y0,x,y);
            break;
        case 'box':
            w=Math.abs(x-x0);
            h=Math.abs(y-y0);
            if(Math.abs(w-h)<snapD*2) w=h; // snap to square
            var left=(x<x0)?(x0-w):x0;
            var top=(y<y0)?(y0-h):y0;
            getElement('blueBox').setAttribute('x',left);
            getElement('blueBox').setAttribute('y',top);
            getElement('blueBox').setAttribute('width',w);
            getElement('blueBox').setAttribute('height',h);
            setSizes('box',null,w,h);
            break;
        case 'oval':
        	w=Math.abs(x-x0);
            h=Math.abs(y-y0);
            if(Math.abs(w-h)<snapD*2) w=h; // snap to circle
            getElement('blueOval').setAttribute('cx',x0);
            getElement('blueOval').setAttribute('cy',y0);
            getElement('blueOval').setAttribute('rx',w/2);
            getElement('blueOval').setAttribute('ry',h/2);
            setSizes('oval',null,w,h);
            break;
        case 'arc':
            if(Math.abs(x-x0)<snapD) x=x0; // snap to vertical
            if(Math.abs(y-y0)<snapD) y=y0; // snap to horizontal
            w=x-x0;
            h=y-y0;
            if((Math.abs(w)<2)&&(Math.abs(h)<2)) break; // wait for significant movement
            arc.cx=x;
            arc.cy=y;
            arc.radius=Math.round(Math.sqrt(w*w+h*h));
            getElement('blueLine').setAttribute('x2',arc.cx);
            getElement('blueLine').setAttribute('y2',arc.cy);
            getElement('blueOval').setAttribute('cx',x);
            getElement('blueOval').setAttribute('cy',y);
            getElement('blueOval').setAttribute('rx',arc.radius);
            getElement('blueOval').setAttribute('ry',arc.radius);
            setSizes('polar',null,x0,y0,x,y);
            break;
        case 'arcEnd':
            if((x==x0)&&(y==y0)) break;
            if(arc.sweep==null) {
                if(Math.abs(y-arc.cy)>Math.abs(x-arc.cx)) { // get sweep from horizontal movement
                    console.log('get sweep from x - x0: '+x0+'; x: '+x);
                    if(y<arc.cy) arc.sweep=(x>x0)?1:0; // above...
                    else arc.sweep=(x<x0)?1:0; // ...or below centre of arc
                }
                else {
                    console.log('get sweep from y');
                    if(x<arc.cx) arc.sweep=(y<y0)?1:0; // left or...
                    else arc.sweep=(y>y0)?1:0; // ...right of centre of arc
                }
                console.log('ARC sweep: '+arc.sweep);
            }
            w=x-arc.cx;
            h=y-arc.cy;
            console.log('w:'+w+' h:'+h);
            arc.a2=Math.atan(h/w); // radians clockwise from x-axis ????????????
            if(w<0) arc.a2+=Math.PI; // from -PI/2 to 1.5PI
            arc.a2+=Math.PI/2; // 0 to 2PI
            console.log('cx:'+arc.cx+' r:'+arc.r+'a2:'+arc.a2+'radians');
            arc.x2=Math.round(arc.cx+arc.r*Math.sin(arc.a2));
            console.log('x2:'+arc.x2);
            arc.y2=Math.round(arc.cy-arc.r*Math.cos(arc.a2));
            console.log('y2:'+arc.y2);
            arc.a2*=180/Math.PI; // 0-360 degrees
            x=arc.x2;
            y=arc.y2;
            x0=arc.cx;
            y0=arc.cy;
            setSizes('polar',null,x0,y0,x,y);
            getElement('blueRadius').setAttribute('x2',arc.x2);
            getElement('blueRadius').setAttribute('y2',arc.y2);
            break;
        case 'dimPlace':
            if(dim.dir=='v') {
                getElement('blueDim').setAttribute('x1',x);
                getElement('blueDim').setAttribute('x2',x);
                dim.offset=Math.round(x-dim.x1);
            }
            else if(dim.dir=='h') {
                getElement('blueDim').setAttribute('y1',y);
                getElement('blueDim').setAttribute('y2',y);
                dim.offset=Math.round(y-dim.y1);
            }
            else { // oblique dimension needs some calculation
                dx=dim.x2-dim.x1;
                dy=dim.y2-dim.y1;
                var a=Math.atan(dy/dx); // angle of line between start and end of dimension
                dx=x-x0;
                dy=y-y0;
                o=Math.sqrt(dx*dx+dy*dy);
                if((y<y0)||((y==y0)&&(x<x0))) o=o*-1;
                dim.offset=Math.round(o);
                getElement('blueDim').setAttribute('x1',dim.x1-o*Math.sin(a));
                getElement('blueDim').setAttribute('y1',dim.y1+o*Math.cos(a));
                getElement('blueDim').setAttribute('x2',dim.x2-o*Math.sin(a));
                getElement('blueDim').setAttribute('y2',dim.y2+o*Math.cos(a));
            }
            break;
        case 'dimAdjust':
            getElement('blueLine').setAttribute('y1',y);
            getElement('blueLine').setAttribute('y2',y);
            break;
        case 'select':
        case 'pointEdit':
            var boxX=(x<x0)?x:x0;
            var boxY=(y<y0)?y:y0;
            w=Math.abs(x-x0);
            h=Math.abs(y-y0);
            getElement('selectionBox').setAttribute('x',boxX);
            getElement('selectionBox').setAttribute('y',boxY);
            getElement('selectionBox').setAttribute('width',w);
            getElement('selectionBox').setAttribute('height',h);
            selectionBox.x=boxX;
            selectionBox.y=boxY;
            selectionBox.w=w;
            selectionBox.h=h;
            setSizes('box',null,w,h);
    }
    event.stopPropagation();
};
getElement('graphic').addEventListener('pointerup',function(e) {
	scr.x=Math.round(event.clientX);
    scr.y=Math.round(event.clientY);
    // console.log('pointer up at '+scr.x+','+scr.y+' ('+x+','+y+') mode: '+mode);
    getElement('graphic').removeEventListener('pointermove',drag);
    getElement('bluePath').setAttribute('d','');
    snap=snapCheck();
    console.log('snap - x:'+snap.x+' y:'+snap.y+' n:'+snap.n);
    if(mode.startsWith('movePoint')) { // move polyline/polygon point
        getElement('handles').innerHTML='';
        // console.log('move point '+node+' on '+type(element));
        if(type(element)=='curve') {
            var graphs=db.transaction('graphs','readwrite').objectStore('graphs');
	        var request=graphs.get(Number(element.id));
	        request.onsuccess=function(event) {
	            var graph=request.result;
	            // console.log('got graph '+graph.id);
	            var points=getElement('bluePolyline').points;
				graph.points='';
	            for(var i=0;i<points.length;i++) {
	        		graph.points+=(points[i].x+','+points[i].y+' ');
	        	}
	            request=graphs.put(graph);
	            request.onsuccess=function(event) {
			        // console.log('graph '+graph.id+' updated');
			        getElement(graph.id).setAttribute('points',graph.points);
			        var d=curvePath(pointsArray(graph.points));
			        getElement(graph.id).setAttribute('d',d); // redraw curve element path
			        cancel();
			        getElement('bluePolyline').setAttribute('points','0,0');
		        };
	            request.onerror=function(event) {
		            console.log("PUT ERROR updating graph "+graph.id);
		        }
	        }
	    }
        else {
        	// console.log('move point '+node);
        	element.points[node].x=x;
        	element.points[node].y=y;
        	if((Math.abs(x-x0)<snapD)&&(Math.abs(y-y0)<snapD)) { // no drag - swop to mover
            // console.log('TAP - add mover at node '+node); // node becomes new element 'anchor'
            var html="<use id='mover"+node+"' href='#mover' x='"+x+"' y='"+y+"'/>";
            getElement('handles').innerHTML=html;
            mode='edit';
            return;
        }
        	updateGraph(elID,['points',element.getAttribute('points')]);
        	refreshNodes(element);
        	cancel();
        }
    }
    else switch(mode) {
        case 'move':
        	console.log('move from '+x0+','+y0+' to '+x+','+y);
            getElement('handles').innerHTML='';
            getElement('blueBox').setAttribute('width',0);
            getElement('blueBox').setAttribute('height',0);
            if(selection.length>0) {
                dx=x-x0;
                dy=y-y0;
                if((Math.abs(dx)<snapD)&&(Math.abs(dy)<snapD)) { // click without dragging - deselect this element
                	var n=selection.indexOf(elID);
                	// console.log('tap on selection['+n+']');
                	selection.splice(n,1); // remove from selection
                	getElement('selection').removeChild(getElement('selection').children[n]);
                	return;
                }
                // console.log('MOVED by '+dx+','+dy+' from '+x0+','+y0+' to '+x+','+y);
            }
            else selection.push(elID); // move single element
            switch(type(element)) {
                // case 'line':
                // case 'shape':
                // case 'box':
                case 'text':
                case 'image':
                    dx=x-x0+offset.x;
                    dy=y-y0+offset.y;
                    var spin=element.getAttribute('spin');
                    spin='rotate('+spin+','+x+','+y+')';
                    // element.setAttribute('transform',spin);
                    // updateGraph(element.id,['transform',spin]);
                    break;
                // case 'oval':
                	var rx=Number(element.getAttribute('rx'));
                	var ry=Number(element.getAttribute('ry'));
                	dx=Number(x-x0);
                	dy=Number(y-y0);
                	console.log('move by '+dx+','+dy);
                    break;
                case 'arc':
                    // console.log('moved arc - node is '+node);
                    dx=x-x0;
                    dy=y-y0;
                    if(node==1) {
                        dx+=(arc.cx-arc.x1);
                        dy+=(arc.cy-arc.y1);
                    }
                    else if(node==2) {
                        dx+=(arc.cx-arc.x2);
                        dy+=(arc.cy-arc.y2);
                    }
                    break;
                default:
                    dx=x-x0;
                    dy=y-y0;
            }
            // console.log('move '+selection.length+' elements by '+dx+','+dy);
            if(anchor && (selection.length>1)) { // dispose of anchor after use
                getElement('blue').removeChild(getElement('anchor'));
                anchor=false;
            }
            while(selection.length>0) { // move all selected elements
                elID=selection.pop();
                // console.log('move element '+elID);
                element=getElement(elID);
                move(element,dx,dy);
                if(spin) {
                	element.setAttribute('transform',spin);
                    updateGraph(element.id,['transform',spin]);
                }
            }
            getElement('selection').setAttribute('transform','translate(0,0)');
            cancel();
            break;
        case 'boxSize':
            console.log('pointer up - moved: '+dx+'x'+dy);
            if((Math.abs(dx)<snapD)&&(Math.abs(dy)<snapD)) { // node tapped - add mover
                // console.log('TAP - add mover at node '+node);
                var html="<use id='mover"+node+"' href='#mover' x='"+x+"' y='"+y+"'/>";
                getElement('handles').innerHTML=html;
                mode='edit';
                return;
            }
            getElement('handles').innerHTML='';
            x=getElement('blueBox').getAttribute('x');
            y=getElement('blueBox').getAttribute('y');
            w=getElement('blueBox').getAttribute('width');
            h=getElement('blueBox').getAttribute('height');
            updateGraph(elID,['x',x,'y',y,'width',w,'height',h]);
            element.setAttribute('x',x);
            element.setAttribute('y',y);
            element.setAttribute('width',w);
            element.setAttribute('height',h);
            getElement('blueBox').setAttribute('width',0);
            getElement('blueBox').setAttribute('height',0);
            refreshNodes(element);
            cancel();
            break;
        case 'ovalSize':
            if((Math.abs(dx)<snapD)&&(Math.abs(dy)<snapD)) { // node tapped - add mover
                // console.log('TAP - add mover at node '+node);
                var html="<use id='mover"+node+"' href='#mover' x='"+x+"' y='"+y+"'/>";
                getElement('handles').innerHTML=html;
                mode='edit';
                return;
            }
            getElement('handles').innerHTML='';
            x=Number(getElement('blueBox').getAttribute('x'));
            y=Number(getElement('blueBox').getAttribute('y'));
            w=Number(getElement('blueBox').getAttribute('width'));
            h=Number(getElement('blueBox').getAttribute('height'));
            updateGraph(elID,['cx',(x+w/2),'y',(y+h/2),'rx',w/2,'height',h/2]);
            element.setAttribute('cx',(x+w/2));
            element.setAttribute('cy',(y+h/2));
            element.setAttribute('rx',w/2);
            element.setAttribute('ry',h/2);
            getElement('blueBox').setAttribute('width',0);
            getElement('blueBox').setAttribute('height',0);
            refreshNodes(element);
            cancel();
            break;
        case 'arcSize':
            if((Math.abs(dx)<snapD)&&(Math.abs(dy)<snapD)) { // node tapped - add mover
                // console.log('TAP - add mover at node '+node);
                var html="<use id='mover"+node+"' href='#mover' x='"+x+"' y='"+y+"'/>";
                getElement('handles').innerHTML=html;
                mode='edit';
                return;
            }
            dx=x-x0;
            dy=y-y0;
            r=Math.sqrt((dx*dx)+(dy*dy));
            // console.log('pointer up - radius: '+r);
            if(Math.abs(r-arc.r)<snapD) { // radius unchanged - set angle
                var a=Math.atan(dy/dx);
                if(node<2) {
                    arc.x1=x0+arc.r*Math.cos(a);
                    arc.y1=y0+arc.r*Math.sin(a);
                }
                else {
                    arc.x2=x0+arc.r*Math.cos(a);
                    arc.y2=y0+arc.r*Math.sin(a);
                }
            }
            else { // radius changed - adjust arc start...
                dx=arc.x1-arc.cx;
                dy=arc.y1-arc.cy;
                dx*=r/arc.r;
                dy*=r/arc.r;
                arc.x1=arc.cx+dx;
                arc.y1=arc.cy+dy; // ...and end points...
                dx=arc.x2-arc.cx;
                dy=arc.y2-arc.cy;
                dx*=r/arc.r;
                dy*=r/arc.r;
                arc.x2=arc.cx+dx;
                arc.y2=arc.cy+dy; // ...and radius 
                arc.r=r;
            }
            var d='M'+arc.cx+','+arc.cy+' M'+arc.x1+','+arc.y1+' A'+arc.r+','+arc.r+' 0 '+arc.major+','+arc.sweep+' '+arc.x2+','+arc.y2;
            element.setAttribute('d',d);
            updateGraph(elID,['x1',arc.x1,'y1',arc.y1,'x2',arc.x2,'y2',arc.y2,'r',arc.r]);
            refreshNodes(element);
            getElement('handles').innerHTML='';
            getElement('blueOval').setAttribute('rx',0);
            getElement('blueOval').setAttribute('ry',0);
            cancel();
            break;
        case 'imageSize':
            // console.log('pointer up - moved: '+dx+'x'+dy);
            if((Math.abs(dx)<snapD)&&(Math.abs(dy)<snapD)) { // node tapped - add mover
                // console.log('TAP - add mover at node '+node);
                var html="<use id='mover"+node+"' href='#mover' x='"+x+"' y='"+y+"'/>";
                getElement('handles').innerHTML=html;
                mode='edit';
                return;
            }
            getElement('handles').innerHTML='';
            x=getElement('blueBox').getAttribute('x');
            y=getElement('blueBox').getAttribute('y');
            w=getElement('blueBox').getAttribute('width');
            h=getElement('blueBox').getAttribute('height');
            updateGraph(elID,['x',x,'y',y,'width',w,'height',h]);
            element.setAttribute('x',x);
            element.setAttribute('y',y);
            element.setAttribute('width',w);
            element.setAttribute('height',h);
            getElement('blueBox').setAttribute('width',0);
            getElement('blueBox').setAttribute('height',0);
            refreshNodes(element);
            cancel();
            break;
        case 'pan':
            // console.log('pan ends at '+x+','+y);
            dwg.x-=(x-x0);
            dwg.y-=(y-y0);
            if((Math.abs(x-x0)<snapD)&&(Math.abs(y-y0)<snapD)) mode='select'; // tap to exit pan mode
            break;
        case 'curve':
            // console.log('end curve');
            var points=getElement('bluePolyline').points;
            // console.log('first blueline point: '+points[0].x+','+points[0].y);
            var point=getElement('svg').createSVGPoint(); // add end point
                point.x=x;
                point.y=y;
                points.appendItem(point);
            // console.log(points.length+' points');
            var graph={};
	        graph.type='curve';
	        graph.points=''; // points stored as string in database
	        for(var i=0;i<points.length-1;i++) {
	        	graph.points+=(points[i].x+','+points[i].y+' ');
	        }
	        console.log('graph.points: '+graph.points);
	        graph.spin=0;
	        graph.stroke=lineColor;
	        graph.lineW=pen*scale;
	        graph.lineType=lineType;
	        graph.lineStyle=lineStyle;
	        if(lineType=='none') graph.lineStyle='solid'; // cannot have empty stroke
	        graph.fillType='none';
	        graph.fill=fillColor;
	        graph.opacity=opacity;
	        graph.blur=blur;
	        graph.layer=layer;
	        addGraph(graph);
	        blueline.setAttribute('points','0,0');
            cancel();
            break;
        case 'line':
            // console.log('pointer up - blueline is '+blueline.id);
            var n=blueline.points.length;
            if(snap) {  // adjust previous point to snap target
                blueline.points[n-1].x=x;
                blueline.points[n-1].y=y;
            }
            var d=Math.sqrt((x-x0)*(x-x0)+(y-y0)*(y-y0));
            refreshNodes(blueline); // set blueline nodes to match new point
            if((d<snapD)||(n>9)) { // click/tap to finish polyline - capped to 10 points
                // console.log('END LINE');
                if(d<snapD) hint('shape closed');
                else if(n>9) hint('10 node limit');
                var points=getElement('bluePolyline').points;
                // console.log('points: '+points.length);
                // create polyline element
                var graph={};
	            graph.type='line';
	            graph.x=blueline.points[0].x;
                graph.y=blueline.points[0].y;
                // console.log('line.x/.y: '+graph.x+','+graph.y);
	            graph.points='';
	            var len=0;
	            for(var i=0;i<points.length-1;i++) {
	                graph.points+=(points[i].x+','+points[i].y+' ');
	                if(i>0) len+=Math.abs(points[i].x-points[i-1].x)+Math.abs(points[i].y-points[i-1].y);
	            }
	            graph.spin=0;
	            graph.stroke=lineColor;
	            graph.lineW=(pen*scale);
	            graph.lineType=lineType;
	        	graph.lineStyle=lineStyle;
	            graph.fillType='none';
	            graph.fill='none';
	            graph.layer=layer;
	            if(len>=scale) addGraph(graph); // avoid zero-size lines
	            blueline.setAttribute('points','0,0');
	            cancel();
            }
            else { // check if close to start point
                point=blueline.points[0]; // start point
                // console.log('at '+x+','+y+' start at '+point.x+','+point.y);
                dx=x-point.x;
                dy=y-point.y;
                var d=Math.sqrt(dx*dx+dy*dy);
                if(d<snapD) { // close to start - create shape
                    // console.log('CLOSE SHAPE');
                    var points=blueline.points;
                    // var points=getElement('bluePolyline').points;
                    // console.log('points: '+points);
                    var graph={}; // create polygon element
                    graph.type='shape';
                    graph.x=blueline.points[0].x;
                    graph.y=blueline.points[0].y;
                    // console.log('line.x/.y: '+graph.x+','+graph.y);
                    graph.points=''; // ***** JUST DO GRAPH.POINTS=BLUELINE.POINTS??? ******
                    var len=0;
	                for(var i=0;i<points.length-1;i++) {
	                    graph.points+=(points[i].x+','+points[i].y+' ');
	                    if(i>0) len+=Math.abs(points[i].x-points[i-1].x)+Math.abs(points[i].y-points[i-1].y);
	                }
	                graph.spin=0;
	                graph.stroke=lineColor;
	                graph.lineW=(pen*scale);
	                graph.lineType=lineType;
	        		graph.lineStyle=lineStyle;
	                graph.fillType=fillType;
	                graph.fill=fillColor;
	                graph.layer=layer;
	                if(len>=scale) addGraph(graph); // avoid zero-size shapes
	                blueline.setAttribute('points','0,0');
	                cancel();
                }
            }
            break;
        case 'shape':
            if(snap) {  // adjust previous point to snap target
                var n=element.points.length;
                var point=element.points[n-1];
                point.x=x;
                point.y=y;
                element.points[n-1]=point;
            }
            point=element.points[0]; // start point
            // console.log('at '+x+','+y+' start at '+point.x+','+point.y);
            dx=x-point.x;
            dy=y-point.y;
            var d=Math.sqrt(dx*dx+dy*dy);
            if((d>snapD)&&(n<11)) break; // check if close to start point - if not, continue but cap at 10 sides
            // console.log('end polyline & create shape');
            var points=getElement('bluePolyline').points;
            // console.log('points: '+points);
            var graph={}; // create polygon element
            graph.type='shape';
            graph.points='';
            var len=0;
	        for(var i=0;i<points.length-1;i++) {
	            graph.points+=(points[i].x+','+points[i].y+' ');
	            if(i>0) len+=Math.abs(points[i].x-points[i-1].x)+Math.abs(points[i].y-points[i-1].y);
	        }
	        graph.spin=0;
	        graph.stroke=lineColor;
	        if(lineType=='none') graph.stroke='none';
	        graph.lineW=(pen*scale);
	        graph.lineType=lineType;
	        graph.lineStyle=lineStyle;
	        graph.fillType=fillType;
	        graph.fill=fillColor;
	        graph.layer=layer;
	        if(len>=scale) addGraph(graph); // avoid zero-size shapes
	        getElement('bluePolyline').setAttribute('points','0,0');
	        cancel();
            break;
        case 'box':
            // console.log('finish box');
            var graph={}
	        graph.type='box';
	        graph.x=parseInt(getElement('blueBox').getAttribute('x'));
	        graph.y=parseInt(getElement('blueBox').getAttribute('y'));
	        graph.width=w;
	        graph.height=h;
	        graph.radius=rad;
	        graph.spin=0;
	        graph.stroke=lineColor;
	        if(lineType=='none') graph.stroke='none';
	        graph.lineW=pen*scale;
	        graph.lineType=lineType;
	        graph.lineStyle=lineStyle;
	        graph.fillType=fillType;
	        graph.fill=fillColor;
	        graph.opacity=opacity;
	        graph.blur=blur;
	        graph.layer=layer;
	        if((graph.width>=scale)&&(graph.width>=scale)) addGraph(graph); // avoid zero-size boxes
            getElement('blueBox').setAttribute('width',0);
            getElement('blueBox').setAttribute('height',0);
            cancel();
            break;
        case 'oval':
            var graph={};
	        graph.type='oval';
	        graph.cx=parseInt(getElement('blueOval').getAttribute('cx'));
	        graph.cy=parseInt(getElement('blueOval').getAttribute('cy'));
	        graph.rx=w/2;
	        graph.ry=h/2;
	        graph.spin=0;
	        graph.stroke=lineColor
	        graph.lineType=lineType;
	        graph.lineStyle=lineStyle;
	        graph.lineW=pen*scale;
	        graph.fillType=fillType;
	        graph.fill=fillColor;
	        graph.opacity=opacity;
	        graph.layer=layer;
	        if((graph.rx>=scale)&&(graph.ry>=scale)) addGraph(graph); // avoid zero-size ovals
		    getElement('blueOval').setAttribute('rx',0);
            getElement('blueOval').setAttribute('ry',0);
            cancel();
            break;
        case 'arc':
            arc.cx=x;
            arc.cy=y;
            // console.log('arcCentre: '+arc.centreX+','+arc.centreY);
            w=arc.x1-arc.cx; // radii
            h=arc.y1-arc.cy;
            arc.r=Math.sqrt(w*w+h*h); // arc radius
            arc.a1=Math.atan(h/w); // start angle - radians clockwise from x-axis NO!!
            if(w<0) arc.a1+=Math.PI; // from -PI/2 to +1.5PI
            arc.a1+=Math.PI/2; // 0 to 2PI
            arc.a1*=180/Math.PI; // 0-180 degrees
            // console.log('START ANGLE: '+(arc.a1)+'; radius: '+arc.r);
            arc.sweep=null; // determine sweep when move pointer
            arc.major=0; // always starts with minor arc
            x0=arc.x1;
            y0=arc.y1;
            getElement('blueRadius').setAttribute('x1',arc.cx); // draw blue arc radius with arrows
            getElement('blueRadius').setAttribute('y1',arc.cy); 
            getElement('blueRadius').setAttribute('x2',arc.x1); 
            getElement('blueRadius').setAttribute('y2',arc.y1);
            mode='arcEnd';
            break;
        case 'arcEnd':
            // console.log('END ANGLE: '+arc.a2);
            var a=arc.a2-arc.a1;
            if(a<0) a+=360;
            if(arc.sweep<1) a=360-a;
            arc.major=(Math.abs(a)>180)? 1:0;
            // console.log('arc angle: '+a+'deg; major: '+arc.major+'; sweep: '+arc.sweep);
            var graph={};
            graph.type='arc';
	        graph.cx=arc.cx; // centre coordinates
	        graph.cy=arc.cy;
	        graph.x1=arc.x1; // start point
	        graph.y1=arc.y1;
	        graph.x2=arc.x2; // end point
	        graph.y2=arc.y2;
	        graph.r=arc.r; // radius
	        graph.major=arc.major; // major/minor arc - 1/0
	        graph.sweep=arc.sweep; // direction of arc - 1: clockwise, 0: anticlockwise
	        graph.spin=0;
	        graph.stroke=lineColor
	        graph.lineType=lineType;
	        graph.lineStyle=lineStyle;
	        graph.lineW=pen*scale;
	        graph.fillType='none'; // arcs default to no fill
	        graph.opacity=1;
	        graph.layer=layer;
	        if((arc.r>=scale)&&(a!=0)) addGraph(graph); // avoid zero-size arcs
            getElement('blueOval').setAttribute('rx',0);
            getElement('blueOval').setAttribute('ry',0);
            getElement('blueLine').setAttribute('x1',0);
            getElement('blueLine').setAttribute('y1',0);
            getElement('blueLine').setAttribute('x2',0);
            getElement('blueLine').setAttribute('y2',0);
            getElement('blueRadius').setAttribute('x1',0);
            getElement('blueRadius').setAttribute('y1',0);
            getElement('blueRadius').setAttribute('x2',0);
            getElement('blueRadius').setAttribute('y2',0);
            cancel();
            break;
        case 'dimStart':
            if(snap) {
                // console.log('SNAP - start dimension at '+x+','+y+'; node '+snap.n);
                dim.x1=x;
                dim.y1=y;
                // dim.el1=snap.el;
                dim.n1=snap.n;
                dim.dir=null;
                mode='dimEnd';
                hint('DIMENSION: tap end node');
            break;
            }
            else hint('DIMENSION: tap start node')
            break;
        case 'dimEnd':
            if(snap) {
                // console.log('SNAP - end dimension at '+x+','+y+'; node '+snap.n);
                dim.x2=x;
                dim.y2=y;
                // dim.el2=snap.el;
                dim.n2=snap.n;
                if(dim.x1==dim.x2) dim.dir='v'; // vertical
                else if(dim.y1==dim.y2) dim.dir='h'; // horizontal
                if(dim.dir) {
                    getElement('blueDim').setAttribute('x1',dim.x1);
                    getElement('blueDim').setAttribute('y1',dim.y1);
                    getElement('blueDim').setAttribute('x2',dim.x2);
                    getElement('blueDim').setAttribute('y2',dim.y2);
                    getElement('guides').style.display='block';
                    hint('DIMENSION: drag to position');
                    mode='dimPlace';
                }
                else showDialog('dimDialog',true);
                // console.log('dimension direction: '+dim.dir);
            }
            else hint('Tap on a node at dimension end-point');
            break;
        case 'dimPlace':
            var graph={};
            graph.type='dim';
            if((dim.x1>dim.x2)||(dim.x1==dim.x2)&&(dim.y1>dim.y2)) {
                graph.x1=dim.x2;
                graph.y1=dim.y2;
                graph.x2=dim.x1;
                graph.y2=dim.y1;
                graph.n1=dim.n2;
                graph.n2=dim.n1;
            }
            else {
                graph.x1=dim.x1;
                graph.y1=dim.y1;
                graph.x2=dim.x2;
                graph.y2=dim.y2;
                graph.n1=dim.n1;
                graph.n2=dim.n2;
            }
            graph.dir=dim.dir; // direction: h/v/o (horizontal/vertical/oblique)
            graph.offset=dim.offset;
            graph.layer=layer;
            getElement('blueDim').setAttribute('x1',0);
            getElement('blueDim').setAttribute('y1',0);
            getElement('blueDim').setAttribute('x2',0);
            getElement('blueDim').setAttribute('y2',0);
            addGraph(graph);
            cancel();
            break;
        case 'dimAdjust':
            var x1=parseInt(getElement('blueLine').getAttribute('x1'));
            var y1=parseInt(getElement('blueLine').getAttribute('y1'));
            var x2=parseInt(getElement('blueLine').getAttribute('x2'));
            var y2=parseInt(getElement('blueLine').getAttribute('y2'));
            var line=element.firstChild;
            line.setAttribute('x1',x1);
            line.setAttribute('y1',y1);
            line.setAttribute('x2',x2);
            line.setAttribute('y2',y2);
            var text=element.childNodes[1];
            text.setAttribute('x',(x1+x2)/2);
            text.setAttribute('y',(y1-1));
            getElement('blueLine').setAttribute('x1',0);
            getElement('blueLine').setAttribute('y1',0);
            getElement('blueLine').setAttribute('x2',0);
            getElement('blueLine').setAttribute('y2',0);
            getElement('blueLine').setAttribute('transform','rotate(0)');
            dy=y1-y0;
            var request=db.transaction('graphs').objectStore('graphs').get(Number(elID));
            request.onsuccess=function(event) {
                dim=request.result;
                // console.log('dimension start node: '+dim.x1+','+dim.y1);
                dim.offset+=dy; // dimension moved up/down before rotation
                request=db.transaction('graphs','readwrite').objectStore('graphs').put(dim);
                request.onsuccess=function(event) {
                    // console.log('dimension graph updated - offset is '+dim.offset );
                }
                request.onerror=function(event) {
                    // console.log('error updating dimension');
                }
            }
            request.onerror=function(event) {
                // console.log('get error');
            }
            cancel();
            break;
        case 'anchor':
            if(snap) {
                // console.log('SNAP - place anchor: '+snap);
                var html="<use id='anchor' href='#mover' x='"+x+"' y='"+y+"'/>";
                getElement('blue').innerHTML+=html; // anchor is pseudo-element - put in <blue> layer
                anchor=true;
                mode='select';
                // console.log('anchor placed');
                setButtons();
            }
            else hint('Tap on a node to place anchor');
            break;
        case 'pointEdit':
            // console.log('SELECT POINTS');
            if((selectionBox.w>20)&&(selectionBox.h>20)) { // significant selection box size
                var left=selectionBox.x;
                var right=selectionBox.x+selectionBox.w;
                var top=selectionBox.y;
                var bottom=selectionBox.y+selectionBox.h;
                // console.log('box: '+left+'-'+right+' x '+top+'-'+bottom);
                var points=element.points;
                // console.log('element has '+points.length+' points');
                selectedPoints=[];
                for(var i=0;i<points.length;i++) {
                    // console.log('point '+i+': '+points[i].x+','+points[i].y);
                    if(points[i].x<left) continue;
                    if(points[i].y<top) continue;
                    if(points[i].x>right) continue;
                    if(points[i].y>bottom) continue;
                    selectedPoints.push(i);
                }
                // console.log(selectedPoints.length+' points selected');
                if(selectedPoints.length>0) getElement('handles').innerHTML=''; // remove handles
                break;
            }
        case 'select':
            getElement('blueBox').setAttribute('width',0);
            getElement('blueBox').setAttribute('height',0);
            getElement('guides').style.display='none';
            // console.log('box size: '+selectionBox.w+'x'+selectionBox.h);
            if((selectionBox.w>20)&&(selectionBox.h>20)) { // significant selection box size
                // console.log('GROUP SELECTION - box: '+selectionBox.w+'x'+selectionBox.h+' at '+selectionBox.x+','+selectionBox.y);
                var items=getElement('dwg').childNodes;
                // console.log(items.length+' elements in dwg');
                for(var i=0;i<items.length;i++) { // collect elements entirely within selectionBox
                    // console.log('item '+i+': '+items[i].id);
                    var el=getElement(items[i].id);
                    if((type(el)=='dim')||!el) continue; // don't include dimensions or 'null' nodes
                    var box=getBounds(items[i]);
                    // console.log('bounds for '+items[i].id+": "+box.x+','+box.y);
                    // console.log('item '+items[i].id+' box: '+box.width+'x'+box.height+' at '+box.x+','+box.y);
                    if(box.x<selectionBox.x) continue;
                    if(box.y<selectionBox.y) continue;
                    if((box.x+box.width)>(selectionBox.x+selectionBox.w)) continue;
                    if((box.y+box.height)>(selectionBox.y+selectionBox.h)) continue;
					// CAN ONLY SELECT BACKGROUND ELEMENTS IF ON LAYER 0
                    if((items[i].getAttribute('layer')>0)||(layer<1)) {
                    	selection.push(items[i].id); // add to selection if passes tests
                    	// console.log('select '+items[i].id);
                    	var html="<rect x='"+box.x+"' y='"+box.y+"' width='"+box.width+"' height='"+box.height+"' ";
                    	html+="stroke='none' fill='blue' fill-opacity='0.25' el='"+items[i].id+"'/>";
                    	getElement('selection').innerHTML+=html;
                    }
                }
                if(selection.length>0) { // highlight selected elements
                    mode='edit';
                    showEditTools(true);
                    // console.log(selection.length+' elements selected');
                    if(selection.length<2) {
                        // console.log('only one selection');
                        getElement('selection').innerHTML=''; // no blue box
                        element=getElement(selection[0]);
                        select(element); // add handles etc
                    }
                    return;
                }
            }
            showInfo(false);
        case 'edit':
            var el=event.target;
            console.log('pointer up on element '+el.id+' parent: '+el.parentNode.id);
            var hit=null;
            if(el.parentNode.id=='graphic') { // drawing background - check 10x10px zone
                // console.log('nowt! - search locality');
                var e=0.5;
                while(e<6 && !hit) {
                	var n=0;
                	while(n<6 && !hit) {
                		el=document.elementFromPoint(scr.x-e,scr.y-n);
                		if((el.id!='svg')&&(!el.id.startsWith('datum'))) hit=el.id;
                		el=document.elementFromPoint(scr.x-e,scr.y+n);
                		if((el.id!='svg')&&(!el.id.startsWith('datum'))) hit=el.id;
                		el=document.elementFromPoint(scr.x+e,scr.y-n);
                		if((el.id!='svg')&&(!el.id.startsWith('datum'))) hit=el.id;
                		el=document.elementFromPoint(scr.x+e,scr.y+n);
                		if((el.id!='svg')&&(!el.id.startsWith('datum'))) hit=el.id;
                		// console.log('e: +/-'+e+' n+/-'+n+' hit: '+hit);
                		n+=0.5;
                	}
                	e+=0.5;
                }
            }
            else while((el.parentNode.id!='dwg')&&(el.parentNode.id!='handles')) {
                el=el.parentNode; // sets have elements within groups in svg container
            }
            // console.log('parent is '+el.parentNode.id);
            if((el.parentNode.id=='dwg')||(el.parentNode.id=='handles')) hit=el.id;
            if(hit) { // NEW - CHECK IF ONLY EDITING CURRENT LAYER
            	// console.log('HIT: '+hit+' type: '+type(el)+' layer '+el.getAttribute('layer')+'; this layer only is '+thisLayerOnly);
            	if(thisLayerOnly && el.getAttribute('layer')!=layer) hit=null; // 
            }
            // else console.log('MISS');
            // console.log('selected: '+selection.length);
            if(hit) {
            	var selectIndex=selection.indexOf(hit);
            	if(selectIndex>=0) { // second hit deselects
            		selection.splice(selectIndex,1); // if already selected, deselect
            		getElement('handles').innerHTML='';
            		getElement('blueBox').setAttribute('width',0);
            		getElement('blueBox').setAttribute('height',0);
            	}
            	else {
            		if(selection.indexOf(hit)<0) {
                    	selection.push(hit);
                    	if(selection.length<2) { // only item selected
                        	element=getElement(hit);
                    		// SINGLE ELEMENT SELECTED - IS IT A NODE?
                        	var snap=snapCheck();
                        	if(snap) console.log('SNAP! element '+element.id+'; snap: element '+Math.floor(snap.n/10)+' node '+snap.n%10+' at '+snap.x+','+snap.y);
                        	select(element,false,snap);
                    	}
                    	else { // multiple selection
                        	// console.log('add '+type(el)+' '+el.id+' to multiple selection');
                        	if(selection.length<3) {
                            	// console.log('SECOND SELECTED ITEM');
                            	getElement('handles').innerHTML='';
                            	select(getElement(selection[0]),true); // highlight first selected item
                        	}
                        	select(el,true);
                    	}
                    	// console.log('selected: '+selection.length+' elements - first one: '+selection[0]);
                    	setStyle();
                    	setButtons();
                	} // else ignore clicks on items already selected
                	showEditTools(true);
            	}
            }
            else { // click on background clears selection
                cancel();
            }
    }
    event.stopPropagation();
});
// ADJUST ELEMENT SIZES
getElement('first').addEventListener('change',function() {
    var val=parseInt(getElement('first').value);
    re('member');
    switch(type(element)) {
        case 'line':
        case 'shape':
            if(elID=='bluePolyline') { // adjust length of latest line segment
                var n=element.points.length;
                var pt0=element.points[n-2];
                var pt1=element.points[n-1];
                w=pt1.x-pt0.x;
                h=pt1.y-pt0.y;
                len=Math.sqrt(w*w+h*h);
                var r=val/len;
                w*=r;
                h*=r;
                x=x0+w;
                y=y0+h;
                pt1.x=x;
                pt1.y=y;
                element.points[n-1]=pt1;
            }
            else { // width of completed (poly)line
                var bounds=element.getBBox();
                w=bounds.width;
                var ratio=val/w;
                var points=element.points;
                // console.log('adjust from node '+node);
                for(i=0;i<points.length;i++) {
                    dx=points[i].x-points[node].x;
                    points[i].x=points[node].x+dx*ratio;
                }
                var pts=[];
	            for(var i=0;i<points.length;i++) {
	                pts.push(points[i].x);
	                pts.push(points[i].y);
	            }
                updateGraph(elID,['points',pts]); // UPDATE DB
                refreshNodes(element);
                getElement('handles').innerHTML='';
                mode='select';
            }
            break;
        case 'box':
            // console.log('change width of element '+elID);
            var elX=parseInt(element.getAttribute('x'));
            var elW=parseInt(element.getAttribute('width'));
            switch(node) {
                case 0: // size from centre
                    elX+=elW/2; // centre x
                    elX-=(val/2); // new x
                    break;
                case 2: // size from right
                case 4:
                    elX+=elW; // right x
                    elX-=val; // new x
                    break;
            }
            element.setAttribute('x',elX);
            element.setAttribute('width',val);
            updateGraph(elID,['x',elX,'width',val]);
            refreshNodes(element);
            getElement('handles').innerHTML='';
            mode='select';
            break;
        case 'oval':
            element.setAttribute('rx',val/2);
            updateGraph(elID,['rx',val/2]);
            var elX=parseInt(element.getAttribute('cx'));
            refreshNodes(element);
            getElement('handles').innerHTML='';
            mode='select';
            break;
        case 'arc':
            // console.log('adjust arc radius to '+val);
            d=element.getAttribute('d');
            getArc(d);
            dx=arc.x1-arc.cx;
            dy=arc.y1-arc.cy;
            dx*=val/arc.r;
            dy*=val/arc.r;
            arc.x1=arc.cx+dx;
            arc.y1=arc.cy+dy;
            // ...and end points...
            dx=arc.x2-arc.cx;
            dy=arc.y2-arc.cy;
            dx*=val/arc.r;
            dy*=val/arc.r;
            arc.x2=arc.cx+dx;
            arc.y2=arc.cy+dy;
            arc.r=val;
            // console.log('arc radius:'+arc.r+' centre:'+arc.cx+','+arc.cy+' start:'+arc.x1+','+arc.y1+' end:'+arc.x2+','+arc.y2);
            var d='M'+arc.cx+','+arc.cy+' M'+arc.x1+','+arc.y1+' A'+arc.r+','+arc.r+' 0 '+arc.major+','+arc.sweep+' '+arc.x2+','+arc.y2;
            element.setAttribute('d',d);
            updateGraph(elID,['x1',arc.x1,'y1',arc.y1,'x2',arc.x2,'y2',arc.y2,'r',arc.r]);
            getElement('handles').innerHTML='';
            mode='select';
            refreshNodes(element);
            break;
        case 'image':
            // console.log('change width (and height) of element '+elID);
            var elX=parseInt(element.getAttribute('x'));
            var elW=parseInt(element.getAttribute('width'));
            var elH=parseInt(element.getAttribute('height'));
            var ratio=elH/elW;
            element.setAttribute('width',val);
            element.setAttribute('heigth',val*ratio);
            updateGraph(elID,['width',val,'height',val*ratio]);
            refreshNodes(element);
            getElement('handles').innerHTML='';
            mode='select';
            break;
    }
});
getElement('second').addEventListener('change',function() {
    var val=parseInt(getElement('second').value);
    re('member');
    switch(type(element)) {
        case 'line':
        case 'shape':
            if(elID=='bluePolyline') { // adjust angle of latest line segment
                var n=element.points.length;
                var pt0=element.points[n-2];
                var pt1=element.points[n-1];
                w=pt1.x-pt0.x;
                h=pt1.y-pt0.y;
                var r=Math.round(Math.sqrt(w*w+h*h));
                if(val==0) {
                    w=0;
                    h=-r;
                }
                else if(val==90) {
                    w=r;
                    h=0;
                }
                else if(val==180) {
                    w=0;
                    h=r;
                }
                else if(val==270) {
                    w=-r;
                    h=0;
                }
                else {
                    val-=90;
                    if(val<0) val+=360;
                    val*=(Math.PI/180);
                    w=r*Math.cos(val);
                    h=r*Math.sin(val);
                }
                pt1.x=pt0.x+w;
                pt1.y=pt0.y+h;
                element.points[n-1]=pt1;
            }
            else { // height of completed (poly)line
                var bounds=element.getBBox();
                h=bounds.height;
                var ratio=val/h;
                var points=element.points;
                // console.log('adjust from node '+node);
                for(i=0;i<points.length;i++) {
                    dy=points[i].y-points[node].y;
                    points[i].y=points[node].y+dy*ratio;
                }
                var pts=[];
	            for(var i=0;i<points.length;i++) {
	                pts.push(points[i].x);
	                pts.push(points[i].y);
	            }
                updateGraph(elID,['points',pts]);
                refreshNodes(element);
                getElement('handles').innerHTML='';
                mode='select';
            }
            break;
        case 'box':
            var elY=parseInt(element.getAttribute('y'));
            var elH=parseInt(element.getAttribute('height'));
            switch(node) {
                case 0: // size from centre
                    elY+=elH/2; // centre y
                    elY-=(val/2); // new y
                    break;
                case 3: // size from bottom
                case 4:
                    elY+=elH; // bottom y
                    elY-=val; // new y
                    break;
            }
            element.setAttribute('y',elY);
            element.setAttribute('height',val);
            updateGraph(elID,['y',elY,'height',val]);
            refreshNodes(element);
            getElement('handles').innerHTML='';
            mode='select';
            break;
        case 'oval':
            element.setAttribute('ry',val/2);
            updateGraph(elID,['ry',val/2]);
            var elY=parseInt(element.getAttribute('cy'));
            refreshNodes(element);
            getElement('handles').innerHTML='';
            mode='select';
            break;
        case 'arc':
            // console.log('change arc angle to '+val);
            val*=Math.PI/180; // radians
            var d=element.getAttribute('d');
            getArc(d);
            arc.a1=Math.atan((arc.y1-arc.cy)/(arc.x1-arc.cx));
            if(arc.sweep>0) arc.a2=arc.a1+val;
            else arc.a2=arc.a1-val;
            arc.x2=arc.cx+arc.r*Math.cos(arc.a2);
            arc.y2=arc.cy+arc.r*Math.sin(arc.a2);
            // console.log('new end point: '+arc.x2+','+arc.y2);
            arc.major=(val>Math.PI)? 1:0;
            d='M'+arc.cx+','+arc.cy+' M'+arc.x1+','+arc.y1+' A'+arc.r+','+arc.r+' 0 '+arc.major+','+arc.sweep+' '+arc.x2+','+arc.y2;
            element.setAttribute('d',d);
            updateGraph(elID,['d',d,'x2',x,'y2',y,'sweep',arc.sweep]);
            refreshNodes(element);
            getElement('handles').innerHTML='';
            mode='select';
    }
});
getElement('spin').addEventListener('change',function() {
    re('member');
    var val=parseInt(getElement('spin').value);
    // console.log('set spin to '+val+' degrees');
    element.setAttribute('spin',val);
    updateGraph(elID,['spin',val]);
    setTransform(element);
    refreshNodes(element);
});
getElement('elementLayer').addEventListener('click',function() {
	// console.log('display layer choice for element '+element.id);
	for(var i=0;i<10;i++) {
		getElement('choice'+i).addEventListener('click',setLayer);
		getElement('choice'+i).checked=(element.getAttribute('layer').indexOf(i)>=0)
	}
	getElement('layerChooser').style.display='block';
});
getElement('undoButton').addEventListener('click',function() {
    re('call'); // recall & reinstate previous positions/points/sizes/spins/flips
});
// FUNCTIONS
function addGraph(graph) {
    // console.log('add '+graph.type+' element - spin: '+graph.spin+' to layer '+graph.layer);
    // console.log('fill: '+graph.fillType+', '+graph.fill);
    var request=db.transaction('graphs','readwrite').objectStore('graphs').add(graph);
    request.onsuccess=function(event) {
        // console.log('result: '+event.target.result);
        graph.id=event.target.result;
        // console.log('graph added - id: '+graph.id+' - draw');
        graph=makeElement(graph);
        return graph;
    }
    request.onerror=function(event) {
        console.log('add copy failed');
    }
}
function addSet(content) {
	// console.log('save set '+content);
	json=JSON.parse(content);
	var name=json.name; // one set per file
	// console.log("add "+name);
	var request=db.transaction('sets','readwrite').objectStore('sets').add(json);
	request.onsuccess=function(e) {
		var n=request.result;
		// console.log("set added to database: "+n);
		listSets();
	};
	request.onerror=function(e) {console.log("error adding sets");};
}
function addImage(file) {
	// console.log('load file '+file.name+' type '+file.type+' '+file.size+' bytes');
    var loader=new FileReader();
    loader.addEventListener('load',function(evt) {
        var data=evt.target.result;
        // console.log('data: '+data.length+' bytes');
        var transaction=db.transaction('images','readwrite');
        var imageStore=transaction.objectStore('images');
        var imageObject={};
        imageObject.name=file.name;
        imageObject.data=data;
        var request=imageStore.add(imageObject);
        request.onsuccess=function(e){
        	// console.log('image '+file.name+' saved to database');
        	listImages();
        }
        request.onerror=function(e){
        	console.log('save image failed');
        }
    });
    loader.addEventListener('error',function(event) {
    	console.log('load failed - '+event);
    });
   	loader.readAsDataURL(file);
    showDialog('loadDialog',false);
}
function cancel() { // cancel current operation and return to select mode
    mode='select';
    getElement('tools').style.display='block';
    element=elID=null;
    selection=[];
    selectedPoints=[];
    selectionBox.w=selectionBox.h=0;
    getElement('selection').innerHTML='';
    getElement('handles').innerHTML=''; //remove element handles...
    getElement('selectionBox').setAttribute('width',0);
    getElement('selectionBox').setAttribute('height',0);
    getElement('blueBox').setAttribute('width',0);
    getElement('blueBox').setAttribute('height',0);
    getElement('blueOval').setAttribute('rx',0);
    getElement('blueOval').setAttribute('ry',0);
    getElement('bluePolyline').setAttribute('points','0,0');
    getElement('guides').style.display='none';
    getElement('datumSet').style.display='none';
    if(anchor) {
        getElement('anchor').remove();
        anchor=false;
    }
    showInfo(false);
    showEditTools(false);
    getElement('textDialog').style.display='none';
    getElement('layerChooser').style.display='none';
    getElement('info').style.top='-30px';
    getElement('info').style.height='30px';
    setStyle(); // set styles to defaults
}
function checkDims(el) {
    // console.log('check linked dimensions for element '+el.id);
    for(var i=0;i<dims.length;i++) {
        if((Math.floor(dims[i].n1/10)==Number(el.id))||(Math.floor(dims[i].n2/10)==Number(el.id))) {
            refreshDim(dims[i]); // adjust and redraw linked dimension
        }
    }
}
function clearDialog(dialog) {
	// console.log('clear '+dialog+' dialog');
	switch(dialog) {
		case 'move':
			getElement('moveRight').value=null;
			getElement('moveDown').value=null;
			getElement('moveDist').value=null;
			getElement('moveAngle').value=null;
			break;
		case 'spin':
			getElement('spinAngle').value=null;
			break;
		case 'double':
			getElement('offset').value=null;
			break;
		case 'repeat':
			getElement('countH').value=1;
			getElement('distH').value=null;
			getElement('countV').value=1;
			getElement('distV').value=null;
			break;
		case 'fillet':
			getElement('filletR').value=null;
	}
	
}
function curvePath(pts) {
	// console.log('get path for '+pts.length+' points');
	var d='M '+pts[0].x+','+pts[0].y; // move to point 0
	if(pts.length<3) d+=' L'+pts[1].x+','+pts[1].y; // 2 points - short straight line
	else {
	    var n=7; // vary n to adjust smoothness of curve - 7 seems a good compromise
	    var c1={}; // control points
	    var c2={};
	    dx=pts[2].x-pts[0].x; // position control points parallel to chord of flanking points
	    dy=pts[2].y-pts[0].y; // this is for point 1
	    c2.x=pts[1].x-dx/n; // first control point
	    c2.y=pts[1].y-dy/n;
	    d+=' Q'+c2.x+','+c2.y+' '+pts[1].x+','+pts[1].y; // first segment - quadratic curve
	    console.log('point 1 path: '+d);
	    var i=2;
	    while(i<pts.length-1) { // intermediate segments
	        c1.x=pts[i-1].x+dx/n; // reflect previous control point
	        c1.y=pts[i-1].y+dy/n;
	        dx=pts[i+1].x-pts[i-1].x;
	        dy=pts[i+1].y-pts[i-1].y;
	        c2.x=pts[i].x-dx/n; // next control point
	        c2.y=pts[i].y-dy/n;
	        d+=' C'+c1.x+','+c1.y+' '+c2.x+','+c2.y+' '+pts[i].x+','+pts[i].y; // cubic curves
	        i++
	    }
	    c1.x=pts[i-1].x+dx/n;
	    c1.y=pts[i-1].y+dy/n;
	    d+=' S'+c1.x+','+c1.y+' '+pts[i].x+','+pts[i].y; // final segment - smooth cubic curve
	}
	console.log('curve path: '+d);
	return d;
}
function getAngle(x0,y0,x1,y1) {
    var dx=x1-x0;
    var dy=y1-y0;
    var a=Math.atan(dy/dx); // range -PI/25 to +PI/2
    a*=180/Math.PI; // -90 to +90 degrees
    a+=90; // 0-180
    if(dx<0) a+=180; // 0-360
    return a;
}
function getArc(d) {
    arc={};
    console.log('get arc from: '+d);
    var from=1;
    var to=d.indexOf(',');
    arc.cx=parseInt(d.substr(from,to));
    from=to+1;
    to=d.indexOf(' ',from);
    arc.cy=parseInt(d.substr(from,to));
    from=d.indexOf('M',to)+1;
    to=d.indexOf(',',from);
    arc.x1=parseInt(d.substr(from,to));
    from=to+1;
    to=d.indexOf(' ',from);
    arc.y1=parseInt(d.substr(from,to));
    from=d.indexOf('A')+1;
    to=d.indexOf(',',from);
    arc.r=parseInt(d.substr(from,to));
    from=to+1;
    to=d.indexOf(',',from);
    arc.major=parseInt(d.charAt(to-1));
    arc.sweep=parseInt(d.charAt(to+1));
    from=d.indexOf(' ',to);
    to=d.indexOf(',',from);
    arc.x2=parseInt(d.substr(from,to));
    from=to+1;
    arc.y2=parseInt(d.substr(from));
    // console.log('arc centre: '+arc.cx+','+arc.cy+' start: '+arc.x1+','+arc.y1+'; radius: '+arc.r+'; major: '+arc.major+'; sweep: '+arc.sweep+'; end: '+arc.x2+','+arc.y2);
}
function getBounds(el) {
    var b=el.getBBox();
    return b;
}
function getElement(el) {
	return document.getElementById(el);
}
function getLineType(el) {
    var lw=parseInt(el.getAttribute('stroke-width'));
    var dash=parseInt(el.getAttribute('stroke-dasharray'));
    if(dash>lw) return 'dashed';
    else if(dash==lw) return'dotted';
    else return 'solid';
}
function getValue(el) {
	var val=parseInt(getElement(el).value);
	if(!val) val=0;
	return val;
}
function hint(text) {
    // console.log('HINT '+text);
    getElement('hint').innerHTML=text; //display text for 10 secs
    var t=parseInt(getElement('info').style.top);
    // console.log('info top: '+t);
    getElement('info').style.height='50px';
	setTimeout(function(){getElement('info').style.height='30px';},10000);
}
function initialise() {
    // console.log('set up size '+size+' '+aspect+' 1:'+scale+' scale '+aspect+' drawing');
    scaleF=25.4*scale/96; // 96px/inch
    handleR=2*scale;
    snapD=2*scale;
    // console.log('scaleF: '+scaleF+' handleR=snapD='+snapD);
    var index=parseInt(size);
    if(aspect=='portrait') index+=7;
    dwg.w=widths[index];
    dwg.h=heights[index];
    // console.log('drawing size '+dwg.w+'x'+dwg.h+'(index: '+index+')');
    var gridSizes=getElement('gridSize').options;
    // console.log('set '+gridSizes.length+' grid size options for scale '+scale);
    gridSizes[0].disabled=(scale>2);
    gridSizes[1].disabled=(scale>5);
    gridSizes[2].disabled=((scale<5)||(scale>10));
    gridSizes[3].disabled=((scale<5)||(scale>20));
    gridSizes[4].disabled=((scale<10)||(scale>50));
    gridSizes[5].disabled=gridSizes[6].disabled=gridSizes[7].disabled=gridSizes[8].disabled=gridSizes[9].disabled=(scale<50);
    var blues=document.getElementsByClassName('blue');
    // console.log(blues.length+' elements in blue class');
    for(var i=0;i<blues.length;i++) blues[i].style.strokeWidth=0.25*scale;
    getElement('moveCircle').setAttribute('r',handleR);
    getElement('moveCircle').style.strokeWidth=scale;
    getElement('sizeDisc').setAttribute('r',handleR);
    getElement('selectionBox').setAttribute('stroke-dasharray',(scale+' '+scale+' '));
    rezoom(); // zoom starts at 1 
    // console.log('scale is '+scale+' svg at '+getElement('svg').getAttribute('left'));
    getElement('datum').setAttribute('transform','scale('+scale+')');
    for(var i=0;i<10;i++) nodes.push({'x':0,'y':0,'n':i}); // 10 nodes for blueline
    getElement('countH').value=getElement('countV').value=1;
    cancel(); // set select mode
}
function listImages() {
	getElement('imageList').innerHTML="<option onclick='hint(\'select an image\');' value=null>select an image</option>"; // rebuild imageList
	var request=db.transaction('images').objectStore('images').openCursor();
    request.onsuccess = function(event) {  
	    var cursor=event.target.result;  
        if(cursor) {
            var image=cursor.value;
            var name=image.name;
            // console.log('add image '+name);
            var html="<g id='"+name+"'>"+image+"</g>";
            html="<option value="+name+">"+name+"</option>";
            getElement('imageList').innerHTML+=html;
            // console.log('image listed');
	    	cursor.continue();  
        }
	    else {
		    // console.log("No more images");
	    }
    };
}
function listSets() {
	// console.log('list sets');
	getElement('setList').innerHTML="<option onclick='hint(\'select a set\');' value=null>select a set</option>"; // rebuild setLists
    getElement('setChooser').innerHTML=''; // clear setChooser list
    var request=db.transaction('sets').objectStore('sets').openCursor();
    request.onsuccess=function(event) {  
	    var cursor=event.target.result;  
        if(cursor) { // add set name to setList and setChooser as option
            var set=cursor.value;
            var name=set.name;
            // console.log('add set '+name);
            var html="<g id='"+name+"'>"+set.svg+"</g>";
            getElement('sets').innerHTML+=html; // copy set svg into <defs>...
            html="<option value='"+name+"'>"+name+"</option>";
            getElement('setList').innerHTML+=html; //...and set name into setList...
            html="<li style='float:right'>"+name+"&nbsp;<input type='checkbox' id='$"+name+"' class='setChoice'></li><br>";
            getElement('setChooser').innerHTML+=html; // ...and setChooser
            // console.log('set added');
	    	cursor.continue();  
        }
    };
}
function load() {
	var transaction=db.transaction('graphs','readonly'); // WAS readwrite
	var graphs=transaction.objectStore('graphs');
	// console.log('READ IN GRAPHS');
    var request=graphs.openCursor();
    request.onsuccess=function(event) {  
	    var cursor=event.target.result;  
        if(cursor) {
            var graph=cursor.value;
            // console.log('LOAD '+graph.type+' id: '+graph.id+' layer: '+graph.layer+'; lineW: '+graph.lineW+'; fill: '+graph.fill);
            // if(graph.type=='image') console.log('image data: '+graph.data);
            var el=makeElement(graph);
            // if(graph.stroke=='blue') getElement('ref').appendChild(el); // blue items go into <ref> ***** NO - LAYER 0 *******
            // else
            getElement('dwg').appendChild(el);
	    	cursor.continue();  
        }
	    else {
	        // console.log('all graphs added');
	    }
    };
    // console.log('all graphs loaded');
    listSets();
    listImages();
    transaction.oncomplete=function() {setLayers()};
}
function makeElement(g) {
    console.log('make '+g.type);
    var ns=getElement('svg').namespaceURI;
    switch(g.type) {
    	case 'curve':
            var el=document.createElementNS(ns,'path');
            el.setAttribute('id',g.id);
            el.setAttribute('points',g.points);
            el.setAttribute('stroke',g.stroke);
            el.setAttribute('stroke-width',g.lineW);
            var dash=setLineType(g);
            if(dash) el.setAttribute('stroke-dasharray',dash);
            el.setAttribute('fillType',g.fillType);
            el.setAttribute('fill',g.fill);
            if(g.opacity<1) el.setAttribute('fill-opacity',g.opacity);
            el.setAttribute('spin',g.spin);
            console.log('curve points: '+g.points);
            // console.log('path: '+curvePath(pointsArray(g.points)));
            el.setAttribute('d',curvePath(pointsArray(g.points)));
            if(g.spin!=0) setTransform(el); // apply spin MAY NOT WORK!!!
            var points=g.points;
            var points=pointsArray(g.points); // convert points list from string to array
            console.log('points: '+points);
            for(var i=0;i<points.length;i++) {
            	console.log('node '+i+' at '+points[i].x+','+points[i].y);
            	nodes.push({'x':points[i].x,'y':points[i].y,'n':Number(g.id*10+i)});
            }
            break;
        case 'line':
            var el=document.createElementNS(ns,'polyline');
            el.setAttribute('id',g.id);
            el.setAttribute('points',g.points);
            el.setAttribute('spin',g.spin);
            el.setAttribute('stroke',g.stroke);
            el.setAttribute('stroke-width',g.lineW);
            var dash=setLineType(g);
            if(dash) el.setAttribute('stroke-dasharray',dash);
            el.setAttribute('fillType',g.fillType);
            el.setAttribute('fill',g.fill);
            if(g.opacity<1) el.setAttribute('fill-opacity',g.opacity);
            el.setAttribute('fill','none');
            var points=el.points;
            console.log('line points: '+points);
            for(var i=0;i<points.length;i++) { // IF HAS SPIN - USE refreshNodes()?
            	var point=points.getItem(i);
                nodes.push({'x':point.x,'y':point.y,'n':Number(g.id*10+i)});
                // console.log('add node '+i+' at '+point.x+','+point.y);
            } // NB node.n is id*10+[0-9]
			if(g.spin!=0) setTransform(el); // apply spin MAY NOT WORK!!!
            break;
        case 'shape':
            var el=document.createElementNS(ns,'polygon');
            el.setAttribute('id',g.id);
            el.setAttribute('points',g.points);
            el.setAttribute('spin',g.spin);
            el.setAttribute('stroke',g.stroke);
            el.setAttribute('stroke-width',g.lineW);
            var dash=setLineType(g);
            if(dash) el.setAttribute('stroke-dasharray',dash);
            el.setAttribute('fillType',g.fillType);
            el.setAttribute('fill',g.fill);
            if(g.opacity<1) el.setAttribute('fill-opacity',g.opacity);
            if(g.opacity<1) el.setAttribute('fill-opacity',g.opacity);
            var points=el.points;
            for(var i=0;i<points.length;i++) { // IF HAS SPIN - USE refreshNodes()?
                nodes.push({'x':points[i].x,'y':points[i].y,'n':Number(g.id*10+i)});
                // console.log('add node '+i+' at '+points[i].x+','+points[i].y);
            }
			if(g.spin!=0) setTransform(el); // apply spin MAY NOT WORK!!!
            break;
        case 'box':
            var el=document.createElementNS(ns,'rect');
            el.setAttribute('id',g.id);
            el.setAttribute('x',g.x);
            el.setAttribute('y',g.y);
            el.setAttribute('width',g.width);
            el.setAttribute('height',g.height);
            // el.setAttribute('rx',g.radius);
            el.setAttribute('spin',g.spin);
            el.setAttribute('stroke',g.stroke);
            el.setAttribute('stroke-width',g.lineW);
            var dash=setLineType(g);
            if(dash) el.setAttribute('stroke-dasharray',dash);
            el.setAttribute('fillType',g.fillType);
            el.setAttribute('fill',g.fill);
            if(g.opacity<1) el.setAttribute('fill-opacity',g.opacity);
            nodes.push({'x':g.x,'y':g.y,'n':(g.id*10)}); // top/left - node 0
            nodes.push({'x':(Number(g.x)+Number(g.width/2)),'y':g.y,'n':Number(g.id*10+1)}); // top/centre - node 1
            nodes.push({'x':(Number(g.x)+Number(g.width)),'y':g.y,'n':Number(g.id*10+2)}); // top/right - node 2
            nodes.push({'x':g.x,'y':(Number(g.y)+Number(g.height/2)),'n':Number(g.id*10+3)}); // centre/left - node 3
            nodes.push({'x':(Number(g.x)+Number(g.width/2)),'y':(Number(g.y)+Number(g.height/2)),'n':Number(g.id*10+4)}); // centre - node 4
            nodes.push({'x':(Number(g.x)+Number(g.width)),'y':(Number(g.y)+Number(g.height/2)),'n':Number(g.id*10+5)}); // centre/right - node 5
            nodes.push({'x':g.x,'y':(Number(g.y)+Number(g.height)),'n':Number(g.id*10+6)}); // bottom/left - node 6
            nodes.push({'x':(Number(g.x)+Number(g.width/2)),'y':(Number(g.y)+Number(g.height)),'n':Number(g.id*10+7)}); // bottom/centre - node 7
            nodes.push({'x':(Number(g.x)+Number(g.width)),'y':(Number(g.y)+Number(g.height)),'n':Number(g.id*10+8)}); // bottom/right - node 8
            if(g.spin!=0) setTransform(el);
            break;
        case 'oval':
            var el=document.createElementNS(ns,'ellipse');
            el.setAttribute('id',g.id);
            el.setAttribute('cx',g.cx);
            el.setAttribute('cy',g.cy);
            el.setAttribute('rx',g.rx);
            el.setAttribute('ry',g.ry);
            el.setAttribute('spin',g.spin);
            el.setAttribute('stroke',g.stroke);
            el.setAttribute('stroke-width',g.lineW);
            var dash=setLineType(g);
            if(dash) el.setAttribute('stroke-dasharray',dash);
            el.setAttribute('fillType',g.fillType);
            el.setAttribute('fill',g.fill);
            if(g.opacity<1) el.setAttribute('fill-opacity',g.opacity);
            nodes.push({'x':g.cx,'y':g.cy,'n':(g.id*10)}); // centre - node 0
            nodes.push({'x':g.cx,'y':Number(g.cy-g.ry),'n':Number(g.id*10+1)}); // ...top/centre - node 1
            nodes.push({'x':Number(g.cx-g.rx),'y':g.cy,'n':Number(g.id*10+2)}); // centre/left - node 2
            nodes.push({'x':Number(g.cx)+Number(g.rx),'y':g.cy,'n':Number(g.id*10+3)}); // centre/right - node 3
            nodes.push({'x':g.cx,'y':Number(g.cy+g.ry),'n':Number(g.id*10+4)}); // bottom/centre - node 4
            if(g.spin!=0) setTransform(el);
            break;
        case 'arc':
            var el=document.createElementNS(ns,'path');
            el.setAttribute('id',g.id);
            el.setAttribute('cx',g.cx);
            el.setAttribute('cy',g.cy);
            var d='M'+g.cx+','+g.cy+' M'+g.x1+','+g.y1+' A'+g.r+','+g.r+' 0 '+g.major+','+g.sweep+' '+g.x2+','+g.y2;
            el.setAttribute('d',d);
            el.setAttribute('spin',g.spin);
            el.setAttribute('stroke',g.stroke);
            el.setAttribute('stroke-width',g.lineW);
            var dash=setLineType(g);
            if(dash) el.setAttribute('stroke-dasharray',dash);
            el.setAttribute('fillType',g.fillType);
            el.setAttribute('fill',g.fill);
            if(g.opacity<1) el.setAttribute('fill-opacity',g.opacity);
            // create nodes for arc start, centre & end points USE refreshNodes()? AND ALLOW FOR SPIN
            nodes.push({'x':g.cx,'y':g.cy,'n':(g.id*10)}); // centre - node 0
            nodes.push({'x':g.x1,'y':g.y1,'n':Number(g.id*10+1)}); // start - node 1
            nodes.push({'x':g.x2,'y':g.y2,'n':Number(g.id*10+2)}); // end - node 2
            if(g.spin!=0) setTransform(el);
            break;
        case 'text':
            var el=document.createElementNS(ns,'text');
            el.setAttribute('id',g.id);
            el.setAttribute('x',g.x);
            el.setAttribute('y',g.y);
            el.setAttribute('spin',g.spin);
            el.setAttribute('flip',g.flip);
            el.setAttribute('font-family',g.textFont);
            el.setAttribute('font-size',g.textSize*scale);
            if(g.textStyle=='bold') el.setAttribute('font-weight','bold');
            else if(g.textStyle=='italic') el.setAttribute('font-style','italic');
            el.setAttribute('stroke','none');
            el.setAttribute('fillType',g.fillType);
            el.setAttribute('fill',g.fill);
            el.setAttribute('text',g.text);
            var t=document.createTextNode(g.text);
			el.appendChild(t).then
				el.innerHTML=textFormat(g.text,g.x);
            if((g.spin!=0)||(g.flip!=0)) setTransform(el);
            break;
        case 'dim':
            dx=Math.round(g.x2-g.x1);
            dy=Math.round(g.y2-g.y1);
            var d=0; // dimension length
            var a=0; // dimension angle
            if(g.dir=='h') {
                    d=Math.abs(dx);
                    a=0;
                }
            else if(g.dir=='v') {
                    d=Math.abs(dy);
                    a=Math.PI/2;
                }
            else {
                d=Math.round(Math.sqrt(dx*dx+dy*dy));
                a=Math.atan(dy/dx); // oblique dimension - angle in radians
            }
            console.log('dimension length: '+d+'; angle: '+a+' rad; nodes: '+g.n1+' '+g.n2);
            var x1=Number(g.x1); // start point/anchor of dimension line
            var y1=Number(g.y1);
            var o=parseInt(g.offset);
            if(a==0) y1+=Number(o);
            else if(a==Math.PI/2) x1+=o;
            else {
                x1-=o*Math.sin(a);
                y1+=o*Math.cos(a);
            }
            a*=180/Math.PI; // angle in degrees
            console.log('create dimension line from '+x1+','+y1+' length: '+d);
            var el=document.createElementNS(ns,'g');
            el.setAttribute('id',g.id);
            el.setAttribute('transform','rotate('+a+','+x1+','+y1+')');
            var dim=document.createElementNS(ns,'line');
            dim.setAttribute('x1',x1);
            dim.setAttribute('y1',y1);
            dim.setAttribute('x2',Number(x1)+Number(d));
            dim.setAttribute('y2',y1);
            dim.setAttribute('marker-start','url(#startArrow)');
            dim.setAttribute('marker-end','url(#endArrow)');
            dim.setAttribute('stroke','gray');
            dim.setAttribute('stroke-width',(0.25*scale));
            dim.setAttribute('fill','none');
            el.appendChild(dim);
            dim=document.createElementNS(ns,'text');
            dim.setAttribute('x',Number(x1)+d/2);
            dim.setAttribute('y',(y1-scale));
            dim.setAttribute('text-anchor','middle');
            dim.setAttribute('font-size',(4*scale));
            dim.setAttribute('stroke','none');
            dim.setAttribute('fill','gray');
            t=document.createTextNode(Math.abs(d));
            dim.appendChild(t);
            el.appendChild(dim);
            dim={}; // no nodes for dimensions but add to dims array
            dim.dim=g.id;
            dim.n1=g.n1;
            dim.n2=g.n2;
            console.log('add link - dim. '+dim.dim+' nodes: '+dim.n1+','+dim.n2);
            dims.push(dim);
            console.log('links added for dimension '+g.id);
            // for(var i=0;i<dims.length;i++) // console.log('link '+i+': dim:'+dims[i].dim+' nodes: '+dims[i].n1+','+dims[i].n2);
            break;
        case 'set':
        	console.log('add set');
            var el=document.createElementNS(ns,'use');
            el.setAttribute('id',g.id);
            el.setAttribute('href','#'+g.name);
            el.setAttribute('x',g.x);
            el.setAttribute('y',g.y);
            el.setAttribute('spin',g.spin);
            el.setAttribute('flip',g.flip);
            nodes.push({'x':g.x,'y':g.y,'n':(g.id*10)});
            if((g.spin!=0)||(g.flip!=0)) setTransform(el);
            break;
        case 'image':
        	// console.log('add image element '+g.name);
        	// console.log('data: '+g.data);
        	var el=document.createElementNS(ns,'image');
            el.setAttribute('id',g.id);
            el.setAttribute('href',g.data);
            el.setAttribute('x',g.x);
            el.setAttribute('y',g.y);
            el.setAttribute('width',g.width);
            el.setAttribute('height',g.height);
            el.setAttribute('spin',g.spin);
            el.setAttribute('flip',g.flip);
            el.setAttribute('opacity',g.opacity);
            if((g.spin!=0)||(g.flip!=0)) setTransform(el);
            break;
    }
    el.setAttribute('layer',g.layer); // layers element appears on
    // if(g.anchor) el.setAttribute('anchor',g.anchor);
    // else el.setAttribute('anchor',0); // node used as element mover/anchor
    // console.log('element layer is '+el.getAttribute('layer'));
    if((g.type!='text')&&(g.type!='dim')&&(g.type!='set')&&(g.type!='image')) { // set style
    	// console.log('set style - fillType is '+g.fillType+'; fill is '+g.fill);
    	el.setAttribute('stroke',g.stroke);
		el.setAttribute('stroke-width',g.lineW);
		if(g.lineStyle=='round') {
			el.setAttribute('stroke-linecap','round');
			el.setAttribute('stroke-linejoin','round');
		}
		else {
			el.setAttribute('stroke-linecap','butt');
			el.setAttribute('stroke-linejoin','miter');
		};
		var dash=setLineType(g);
		if(dash) el.setAttribute('stroke-dasharray',dash);
		if(g.fillType.startsWith('pattern')) {
			var n=Number(g.fillType.substr(7));
			// console.log('fillType is '+g.fillType);
			var html="<pattern id='pattern"+g.id+"' index='"+n+"' width='"+pattern[n].width+"' height='"+pattern[n].height+"' patternUnits='userSpaceOnUse'";
			if(pattern[n].spin>0) html+=" patternTransform='rotate("+pattern[n].spin+")'";
			html+='>'+tile[pattern[n].tile]+'</pattern>';
			// console.log('pattern HTML: '+html);
			getElement('defs').innerHTML+=html;
			getElement('pattern'+g.id).firstChild.setAttribute('fill',g.fill);
			getElement('pattern'+g.id).lastChild.setAttribute('fill',g.fill);
			el.setAttribute('fill','url(#pattern'+g.id+')');
		}
		else el.setAttribute('fill',(g.fillType=='none')?'none':g.fill);
		if(g.opacity<1) {
			el.setAttribute('stroke-opacity',g.opacity);
			el.setAttribute('fill-opacity',g.opacity);
		}
		if(g.blur>0) el.setAttribute('filter','url(#blur'+g.blur+')');
    }
    getElement('dwg').appendChild(el);
    return el;
}
function move(el,dx,dy) {
    switch(type(el)) {
    	case 'curve':
            // console.log('move all points by '+dx+','+dy);
            var graphs=db.transaction('graphs','readwrite').objectStore('graphs');
	        var request=graphs.get(Number(el.id));
	        request.onsuccess=function(event) {
	            var graph=request.result;
	            // console.log('got graph '+graph.id);
	            var points=pointsArray(graph.points);
	            console.log(points.length+' points');
	            for(var i=0;i<points.length;i++) {
	                points[i].x+=dx;
	                points[i].y+=dy;
	            }
	            graph.points=''; // points stored as string in database
	        	for(i=0;i<points.length-1;i++) {
	        		graph.points+=(points[i].x+','+points[i].y+' ');
	        	}
	            request=graphs.put(graph);
	            request.onsuccess=function(event) {
			        console.log('graph '+el.id+' updated - starts at '+points[0].x+','+points[0].y);
			        el.setAttribute('d',curvePath(points)); // redraw curve element path
		        };
		        request.onerror=function(event) {
		            console.log("PUT ERROR updating graph "+id);
		        };
	        }
            break;
        case 'line':
        case 'shape':
            // console.log('move all points by '+dx+','+dy);
            var pts='';
            for(var i=0;i<el.points.length;i++) {
                el.points[i].x+=dx;
                el.points[i].y+=dy;
                pts+=el.points[i].x+','+el.points[i].y+' ';
            }
            el.setAttribute('points',pts);
            // console.log(element.points.length+' points adjusted');
            updateGraph(el.id,['points',el.getAttribute('points')]);
            break;
        case 'box':
        case 'set':
        case 'image':
            var valX=parseInt(el.getAttribute('x'));
            valY=parseInt(el.getAttribute('y'));
            valX+=dx;
            valY+=dy;
            el.setAttribute('x',valX);
			el.setAttribute('y',valY);
            updateGraph(el.id,['x',valX,'y',valY]);
            break;
        case 'oval':
            console.log('move oval by '+dx+','+dy);
            var valX=parseInt(el.getAttribute('cx'));
            valX+=Number(dx);
            el.setAttribute('cx',valX);
            valY=parseInt(el.getAttribute('cy'));
            valY+=Number(dy);
            el.setAttribute('cy',valY);
            updateGraph(el.id,['cx',valX,'cy',valY]);
            break;
        case 'arc':
            var d=el.getAttribute('d');
            getArc(d);
            arc.cx+=dx;
            arc.cy+=dy;
            arc.x1+=dx;
            arc.y1+=dy;
            arc.x2+=dx;
            arc.y2+=dy;
            d='M'+arc.cx+','+arc.cy+' M'+arc.x1+','+arc.y1+' A'+arc.r+','+arc.r+' 0 '+arc.major+','+arc.sweep+' '+arc.x2+','+arc.y2;
            updateGraph(el.id,['d',d,'cx',arc.cx,'cy',arc.cy,'x1',arc.x1,'y1',arc.y1,'x2',arc.x2,'y2',arc.y2]);
            el.setAttribute('d',d);
            break;
        case 'text':
        	var valX=parseInt(el.getAttribute('x'));
            valY=parseInt(el.getAttribute('y'));
            // console.log('move by '+dx+','+dy+' from '+valX+','+valY);
            valX+=dx;
            valY+=dy;
            // console.log('to '+valX+','+valY);
            el.setAttribute('x',valX);
			el.setAttribute('y',valY);
			// console.log('new position: '+el.getAttribute('x')+','+el.getAttribute('y'));
            updateGraph(el.id,['x',valX,'y',valY],true);
    }
    setTransform(el); // adjust spin to new position
    refreshNodes(el);
}
function pointsArray(points) {
	var pts=[];
	var pt={};
	var i=0;
	while(i<points.length) {
		pt=new StringPoint(points.substring(i,points.indexOf(' ',i)));
		// console.log('point: '+pt.x+','+pt.y);
		pts.push(pt);
		i=points.indexOf(' ',i)+1
	}
	// console.log(pts.length+' points');
	return pts;
}
function re(op) {
	// op is 're-member' (memorise and show undo), 're-call' (reinstate and hide undo) or 're-wind' (hide undo)
    // console.log('re'+op+'; '+selection.length+' selected items; '+memory.length+' memory items');
    // console.log('item 1: '+selection[0]);
    if(op=='member') {
        memory=[];
        // console.log('REMEMBER');
        for(var i=0;i<selection.length;i++) {
            elID=selection[i];
            // console.log('selected item '+i+': '+elID);
            var el=getElement(elID);
            var props={};
            props.id=elID; // all elements have an id
            // console.log('element '+elID+' - '+type(el));
            switch(type(el)) {
                case 'line':
                case 'shape':
                    var pts='';
                    for(var j=0;j<el.points.length;j++) pts+=el.points[j].x+','+el.points[j].y+' ';
                    props.points=pts;
                    break;
                case 'box':
                    // console.log('remember box '+elID);
                    props.x=el.getAttribute('x');
                    props.y=el.getAttribute('y');
                    props.width=el.getAttribute('width');
                    props.height=el.getAttribute('height');
                    props.rx=el.getAttribute('rx');
                    break;
                case 'oval':
                    props.cx=el.getAttribute('cx');
                    props.cy=el.getAttribute('cy');
                    props.rx=el.getAttribute('rx');
                    props.ry=el.getAttribute('ry');
                    break;
                case 'arc':
                    props.d=el.getAttribute('d');
                case 'text':
                case 'set':
                    props.x=el.getAttribute('x');
                    props.y=el.getAttribute('y');
                    props.flip=el.getAttribute('flip');
            }
            props.spin=el.getAttribute('spin'); // any element can have spin
            if(props.spin!=0) props.transform=el.getAttribute('transform');
            memory.push(props);
            // console.log('selection['+i+']: '+props.id);
        }
        getElement('line').style.display='none';
        getElement('undoButton').style.display='block';
        return;
    }
    else if(op=='call') for(var i=0;i<memory.length;i++) { // reinstate from memory
        var item=memory[i];
        // console.log('reinstate item '+item.id);
        elID=item.id;
        var el=getElement(elID);
        // console.log('reinstate '+elID);
        switch(type(el)) {
            case 'line':
            case 'shape':
                // console.log(item.points.length+' points - from '+item.points[0].x+','+item.points[0].y);
                el.setAttribute('points',item.points);
                updateGraph(elID,['points',el.getAttribute('points'),'spin',item.spin]);
                refreshNodes(el);
                break;
            case 'box':
                // console.log('reinstate box element');
                el.setAttribute('x',item.x);
                el.setAttribute('y',item.y);
                el.setAttribute('width',item.width);
                el.setAttribute('height',item.height);
                el.setAttribute('rx',item.rx);
                el.setAttribute('spin',item.spin);
                updateGraph(elID,['x',item.x,'y',item.y,'spin',item.spin,'flip',item.flip]);
                refreshNodes(el);
                break;
            case 'text':
            case 'set':
                el.setAttribute('x',item.x);
                el.setAttribute('y',item.y);
                el.setAttribute('flip',item.flip);
                updateGraph(elID,['x',item.x,'y',item.y,'spin',item.spin,'flip',item.flip]);
                refreshNodes(el);
                break;
            case 'oval':
                el.setAttribute('cx',item.cx);
                el.setAttribute('cy',item.cy);
                el.setAttribute('rx',item.rx);
                el.setAttribute('ry',item.ry);
                updateGraph (elID,['cx',item.cx,'cy',item.cy,'rx',item.rx,'ry',item.ry,'spin',item.spin]);
                refreshNodes(el);
                break;
            case 'arc':
                el.setAttribute('d',item.d);
                getArc(item.d);
                updateGraph(elID,['cx',arc.cx,'cy',arc.cy,'r',arc.r,'x1',arc.x1,'y1',arc.y1,'x2',arc.x2,'y2',arc.y2,'spin',item.spin]);
                refreshNodes(el);
        }
        el.setAttribute('spin',item.spin);
        if(item.transform) el.setAttribute('transform',item.transform)
        else el.setAttribute('transform','rotate(0)');
    }
    getElement('undoButton').style.display='none';
    getElement('line').style.display='block';
}
function redrawDim(d) {
    var request=db.transaction('graphs','readwrite').objectStore('graphs').put(d);
    request.onsuccess=function(event) {
        // console.log('dimension '+dim.id+' updated - redraw from '+d.x1+','+d.y1+' to '+d.x2+','+d.y2+' direction: '+d.dir);
        var len=0; // dimension length...
        var a=0; // ...and angle
        if(d.dir=='h') { // horizontal dimension
            len=d.x2-d.x1;
            a=0;
        }
        else if(d.dir=='v') { // vertical dimension
            len=d.y2-d.y1;
            a=Math.PI/2;
        }
        else { // oblique dimension
            w=Math.round(d.x2-d.x1);
            h=Math.round(d.y2-d.y1);
            len=Math.sqrt(w*w+h*h);
            a=Math.atan(h/w); // angle in radians
        }
        len=Math.round(len);
        // console.log('dimension length: '+len+'; angle: '+a+'radians; elements: '+d.el1+' '+d.el2);
        var o=parseInt(d.offset);
        var x1=d.x1; // start point/anchor of dimension line
        var y1=d.y1;
        if(a==0) y1+=o;
        else if(a==Math.PI/2) x1+=o;
        else {
            x1-=o*Math.sin(a);
            y1+=o*Math.cos(a);
        }
        a*=180/Math.PI; // angle in degrees
        var t='rotate('+a+','+x1+','+y1+')';
        getElement(d.id).setAttribute('transform',t); // adjust dimension rotation
        var line=getElement(d.id).firstChild;
        line.setAttribute('x1',x1); // adjust dimension end points
        line.setAttribute('y1',y1);
        line.setAttribute('x2',x1+len);
        line.setAttribute('y2',y1);
        t=getElement(d.id).children[1]; // adjust text location
        t.setAttribute('x',Number(x1+len/2));
        t.setAttribute('y',Number(y1-1));
        t.innerHTML=len; // adjust dimension measurement
        // console.log('dimension '+d.id+' redrawn');
    }
    request.onerror=function(event) {
        console.log('dimension update failed');
    }
}
function refreshDim(d) {
    // console.log('refresh dimension '+d.dim+' from node '+d.n1+' to node '+d.n2);
    var node1=nodes.find(function(node) {
        return (node.n==Number(d.n1));
    });
    // console.log('start node: '+node1);
    var node2=nodes.find(function(node) {
        return (node.n==Number(d.n2));
    });
    // console.log('end node: '+node2);
    var request=db.transaction('graphs').objectStore('graphs').get(Number(d.dim));
    request.onsuccess=function(event) {
        dim=request.result;
        // console.log('got dimension '+dim.id);
        dim.x1=node1.x;
        dim.y1=node1.y;
        dim.x2=node2.x;
        dim.y2=node2.y;
        redrawDim(dim);
    }
    request.onerror=function(event) {
        console.log('get dimension failed');
    }
}
function refreshNodes(el) {
    // console.log('check nodes for el '+el.id);
    if(el==blueline) {
        var points=el.points;
        // console.log(points.length+' points in blueline');
        for(var i=0;i<points.length;i++) { // blueline nodes are first 10 in nodes[]
            nodes[i].x=Number(points[i].x);
            nodes[i].y=Number(points[i].y);
            // console.log('node '+i+': '+nodes[i].x+','+nodes[i].y);
        }
        return;
    }
    /* var elNodes=nodes.filter(function(node) {
        return (Math.floor(node.n/10)==Number(el.id));
    });*/
    // console.log('refresh '+elNodes.length+' nodes for element '+el.id);
    var ox=0; // element origin for spin
    var oy=0;
    var r=0; // radius for spin
    var a=0; // angle
    var spin=parseInt(el.getAttribute('spin'));
    
    elNodes=nodes.filter(function(node) { // get nodes for selected element
        return (Math.floor(node.n/10)==el.id);
    });
    
    switch(type(el)) {
        case 'line':
        case 'shape':
            var points=el.points;
            // console.log(points.length+' points');
            ox=Number(points[0].x); // spin around start point
            oy=Number(points[0].y);
            // console.log('origin: '+ox+','+oy+' spin: '+spin);
            elNodes[0].x=ox;
            elNodes[0].y=oy;
            if(points.length>elNodes.length) { // adding point
                elNodes.push({'x':0,'y':0}); // initialise new node at 0,0 - will soon be reset
                // console.log('node added');
            }
            // console.log(points.length+' points; '+elNodes.length+' nodes');
            for(var i=1;i<points.length;i++) {
                if(spin==0) { // no spin
                    elNodes[i].x=Number(points[i].x);
                    elNodes[i].y=Number(points[i].y);
                }
                else { // spin nodes around start point
                    dx=Number(points[i].x)-ox;
                    dy=Number(points[i].y)-oy;
                    // console.log('dx:'+dx+' dy:'+dy);
                    a=Math.atan(dy/dx);
                    r=Math.sqrt(dx*dx+dy*dy);
                    a+=(spin*Math.PI/180);
                    // console.log('a:'+a+' r:'+r);
                    dx=r*Math.cos(a);
                    dy=r*Math.sin(a);
                    elNodes[i].x=ox+dx;
                    elNodes[i].y=oy+dy;
                }
                // console.log('node '+i+': '+elNodes[i].x+','+elNodes[i].y);
            }
            break;
        case 'box':
            x=Number(el.getAttribute('x')); // left
            y=Number(el.getAttribute('y')); // top
            w=Number(el.getAttribute('width'));
            h=Number(el.getAttribute('height'));
            var a=Number(el.getAttribute('spin'));
            a*=Math.PI/180;
            var c=Math.cos(a);
            var s=Math.sin(a);
            // console.log(' spin: '+a+' radians cos: '+c+' sine: '+s);
            elNodes[0].x=x; // top/left
            elNodes[0].y=y;
            elNodes[1].x=x+c*w/2; // top/centre
            elNodes[1].y=y+s*w/2;
            elNodes[2].x=x+c*w; // top/right
            elNodes[2].y=y+s*w;
            elNodes[3].x=x-s*h/2; // centre/left
            elNodes[3].y=y+c*h/2;
            elNodes[4].x=x+c*w/2-s*h/2; // centre
            elNodes[4].y=y+s*w/2+c*h/2;
            elNodes[5].x=x+c*w-s*h/2; // centre/right
            elNodes[5].y=y+s*w+c*h/2;
            elNodes[6].x=x-s*h; // bottom/left
            elNodes[6].y=y+c*h;
            elNodes[7].x=x+c*w/2-s*h; // bottom/centre
            elNodes[7].y=y+s*w/2+c*h;
            elNodes[8].x=x+c*w-s*h; // bottom/right
            elNodes[8].y=y+s*w+c*h;
            /* OLD CODE - MOVER AT CENTRE & spin around centre
            x+=w/2; // centre
            y+=h/2;
            elNodes[0].x=x; // centre
            elNodes[0].y=y;
            elNodes[1].x=x-w*c/2+h*s/2; // top/left
            elNodes[1].y=y-w*s/2-h*c/2;
            elNodes[2].x=x+s*h/2; // top/centre
            elNodes[2].y=y-c*h/2;
            elNodes[3].x=x+w*c/2+h*s/2; // top/right
            elNodes[3].y=y+w*s/2-h*c/2;
            elNodes[4].x=x+w*c/2; // centre/right
            elNodes[4].y=y+w*s/2;
            elNodes[5].x=x+w*c/2-h*s/2; // bottom/right
            elNodes[5].y=y+w*s/2+h*c/2;
            elNodes[6].x=x-h*s/2; // bottom/centre
            elNodes[6].y=y+h*c/2;
            elNodes[7].x=x-w*c/2-h*s/2; // bottom/left
            elNodes[7].y=y-w*s/2+h*c/2;
            elNodes[8].x=x-w*c/2; // centre/left
            elNodes[8].y=y-w*s/2;
            */
            break;
        case 'oval':
            x=Number(el.getAttribute('cx'));
            y=Number(el.getAttribute('cy'));
            var rx=Number(el.getAttribute('rx'));
            var ry=Number(el.getAttribute('ry'));
            var a=Number(el.getAttribute('spin'));
            a*=Math.PI/180;
            var c=Math.cos(a);
            var s=Math.sin(a);
            elNodes[0].x=x; // centre
            elNodes[0].y=y;
            elNodes[1].x=x+s*ry; // top/centre
            elNodes[1].y=y-c*ry;
            elNodes[2].x=x+rx*c; // centre/right
            elNodes[2].y=y+rx*s;
            elNodes[3].x=x-rx*c; // centre/left
            elNodes[3].y=y-rx*s;
            elNodes[4].x=x-s*ry; // bottom/centre
            elNodes[4].y=y+c*ry;
            break;
        case 'arc':
            var d=el.getAttribute('d');
            // console.log('arc path: '+d);
            elNodes[0].x=arc.cx; // centre
            elNodes[0].y=arc.cy;
            elNodes[1].x=arc.x1; // start point
            elNodes[1].y=arc.y1;
            elNodes[2].x=arc.x2; // end point
            elNodes[2].y=arc.y2;
            // console.log('arc centre node: '+elNodes[0].x+','+elNodes[0].y);
            break;
        case 'set':
            elNodes[0].x=Number(el.getAttribute('ax'));
            elNodes[0].y=Number(el.getAttribute('ay'));
            break;
    }
    checkDims(el); // check if any dimensions need refreshing
}
function remove(elID,keepNodes) {
    // console.log('remove element '+elID);
    var linkedDims=[]; // first check for any linked dimensions
    for(var i=0;i<dims.length;i++) {
        if((Math.floor(dims[i].n1/10)==Number(elID))||(Math.floor(dims[i].n2/10)==Number(elID))) {
            linkedDims.push(dims[i].dim);
            dims.splice(i,1); // remove dimension link
        }
    }
    var el=getElement(elID);
    var ptn=getElement('pattern'+elID); // remove any associated pattern
    if(ptn) ptn.remove(); 
    var request=db.transaction('graphs','readwrite').objectStore('graphs').delete(Number(elID));
    request.onsuccess=function(event) {
        el.remove();
        // console.log('element removed');
    }
 	request.onerror=function(event) {
	    console.log("error deleting element "+el.id);
	};
	while(linkedDims.length>0) remove(linkedDims.pop()); // remove any linked dimensions
}
function rezoom() {
	w=Math.round(scr.w*scaleF/zoom);
    h=Math.round(scr.h*scaleF/zoom);
    // console.log('screen: '+scr.w+'x'+scr.h+' scaleF: '+scaleF+' new viewBox: '+dwg.x+','+dwg.y+' '+w+'x'+h);
    getElement('svg').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+w+' '+h);
    getElement('paper').setAttribute('viewBox',dwg.x+' '+dwg.y+' '+w+' '+h);
    getElement('paperSheet').setAttribute('width',dwg.w*scale);
    getElement('paperSheet').setAttribute('height',dwg.h*scale);
    getElement('clipBox').setAttribute('width',dwg.w*scale);
    getElement('clipBox').setAttribute('height',dwg.h*scale);
}
async function save(fileName,data,type) {
	var handle;
	if(!fileName) fileName='untitled';
	if(fileName.indexOf(type)<0) fileName+='.'+type;
	if(type=='svg') opts={suggestedName: fileName, types:[{description:'svg file',accept:{'image/svg+xml':['.svg']}}]};
	else opts={suggestedName: fileName};
	handle=await window.showSaveFilePicker(opts);
	// console.log('file handle: '+handle);
	if(!name) { // save drawing name at first save
		name=handle.name;
		if(name.indexOf('.')>0) name=name.substring(0,name.indexOf('.'));
		window.localStorage.setItem('name',name);
	}
	var writable=await handle.createWritable();
    await writable.write(data);
    await writable.close();
}
function select(el,multiple,snapNode) {
	if(multiple) { // one of multiple selection - highlight in blue
		// console.log('select element '+el.id+' of multiple selection');
		var box=getBounds(el);
		var html="<rect x='"+box.x+"' y='"+box.y+"' width='"+box.width+"' height='"+box.height+"' ";
		html+="stroke='none' fill='blue' fill-opacity='0.25' el='"+el.id+"'/>";
		// console.log('box html: '+html);
		getElement('selection').innerHTML+=html; // blue block for this element
	}
	else {
		element=el;
		if(snapNode) console.log('place mover on node '+snapNode.n+' at '+snapNode.x+','+snapNode.y);
		var elementLayers=element.getAttribute('layer');
		// console.log('SELECT ELEMENT '+element.getAttribute('id')+' - layer '+elementLayers);
		getElement('layers').innerText=elementLayers;
		for(var l=0;l<elementLayers.length;l++) getElement('choice'+l).checked=true;
    	getElement('handles').innerHTML=''; // clear any handles then add handles for selected element 
    	elNodes=nodes.filter(function(node) { // get nodes for selected element
        	return (Math.floor(node.n/10)==element.id);
    	});
    	console.log(elNodes.length+' nodes');
    	for(i=0;i<elNodes.length;i++) { // draw tiny disc at each node
    		var html="<use href='#node' x='"+elNodes[i].x+"' y='"+elNodes[i].y+"' r='"+scale/2+"'/>";
    		console.log('node at '+elNodes[i].x+','+elNodes[i].y);
    		getElement('handles').innerHTML+=html;
    		// getElement('nodes').innerHTML+=html;
    	}
    	switch(type(el)) {
    		case 'curve':
				var graphs=db.transaction('graphs','readwrite').objectStore('graphs');
				var request=graphs.get(Number(el.id));
				request.onsuccess=function(event) {
					var graph=request.result;
					console.log('got graph '+graph.id+' points: '+graph.points);
					el.points=pointsArray(graph.points);
					// console.log(el.points.length+' points');
					getElement('bluePolyline').setAttribute('points',graph.points);
					var html='';
					for(var i=1;i<el.points.length;i++) html+="<use id='sizer"+i+"' href='#sizer' x='"+el.points[i].x+"' y='"+el.points[i].y+"'/>";
					// getElement('handles').innerHTML+=html; // disc handles move nodes
					if(snapNode) html+="<use id='mover"+snapNode.n%10+"' href='#mover' x='"+snapNode.x+"' y='"+snapNode.y+"'/>"; // mover at node
					else html+="<use id='mover0' href='#mover' x='"+el.points[0].x+"' y='"+el.points[0].y+"'/>"; // mover at start
					getElement('handles').innerHTML+=html; // circle handle moves whole element
					hint('CURVE');
				}
				getElement('guides').style.display='block';
				node=0; // default anchor node
				mode='pointEdit';
				break;
        	case 'line':
        	case 'shape':
            	var bounds=el.getBBox();
            	w=bounds.width;
            	h=bounds.height;
            	var points=el.points;
            	var n=points.length;
            	// console.log('bounds: '+w+'x'+h+'mm; '+n+' points');
            	setSizes('box',el.getAttribute('spin'),w,h); // size of bounding box
            	// draw handles
            	var html='';
            	for(var i=1;i<n;i++) {
                	html="<use id='sizer"+i+"' href='#sizer' x='"+points[i].x+"' y='"+points[i].y+"'/>";
                	getElement('handles').innerHTML+=html; // disc handles move remaining nodes
            	}
            	if(snapNode) html="<use id='mover"+snapNode.n%10+"' href='#mover' x='"+snapNode.x+"' y='"+snapNode.y+"'/>"; // mover at node
            	else html="<use id='mover0' href='#mover' x='"+points[0].x+"' y='"+points[0].y+"'/>"; // mover at start
            	getElement('handles').innerHTML+=html; // circle handle moves whole element
            	getElement('bluePolyline').setAttribute('points',el.getAttribute('points'));
            	getElement('guides').style.display='block';
            	// console.log('type: '+type(el)+'; layer: '+el.getAttribute('layer'));
            	showInfo(true,(type(el)=='shape')?'SHAPE':'LINE',el.getAttribute('layer'));
            	node=0; // default anchor node
            	mode='pointEdit';
            	break;
        	case 'box':
            	x=parseFloat(el.getAttribute('x'));
            	y=parseFloat(el.getAttribute('y'));
            	w=parseFloat(el.getAttribute('width'));
            	h=parseFloat(el.getAttribute('height'));
            	// draw blueBox for sizing
            	getElement('blueBox').setAttribute('x',x); // SET blueBox TO MATCH BOX (WITHOUT SPIN)
            	getElement('blueBox').setAttribute('y',y);
            	getElement('blueBox').setAttribute('width',w);
            	getElement('blueBox').setAttribute('height',h);
            	getElement('blueBox').setAttribute('transform','rotate(0)');
            	getElement('guides').style.display='block';
            	var html="<use id='sizer' href='#sizer' x='"+(x+w)+"' y='"+(y+h)+"'/>"; // sizer at bottom/right
            	if(snapNode) html+="<use id='mover"+snapNode.n%10+"' href='#mover' x='"+snapNode.x+"' y='"+snapNode.y+"'/>"; // mover at a node
            	else html+="<use id='mover0' href='#mover' x='"+x+"' y='"+y+"'/>"; // mover at top/left
            	getElement('handles').innerHTML+=html;
            	// console.log('spin: '+el.getAttribute('spin')+' layer is '+el.getAttribute('layer'));
            	setSizes('box',el.getAttribute('spin'),w,h);
            	showInfo(true,(w==h)?'SQUARE':'BOX',el.getAttribute('layer'));
            	node=0; // default anchor node
            	mode='edit';
            	break;
        	case 'oval':
            	x=parseFloat(el.getAttribute('cx'));
            	y=parseFloat(el.getAttribute('cy'));
            	w=parseFloat(el.getAttribute('rx'))*2;
            	h=parseFloat(el.getAttribute('ry'))*2;
            	getElement('blueBox').setAttribute('x',(x-w/2)); // SET blueBox TO MATCH OVAL (WITHOUT SPIN)
            	getElement('blueBox').setAttribute('y',(y-h/2));
            	getElement('blueBox').setAttribute('width',w);
            	getElement('blueBox').setAttribute('height',h);
            	getElement('blueBox').setAttribute('transform','rotate(0)');
            	getElement('guides').style.display='block';
            	var html='';
            	if(snapNode) html="<use id='mover"+snapNode.n%10+"' href='#mover' x='"+snapNode.x+"' y='"+snapNode.y+"'/>"; // mover at a node
            	else html="<use id='mover0' href='#mover' x='"+x+"' y='"+y+"'/>"; // mover at centre
            	html+="<use id='sizer' href='#sizer' x='"+(x+w/2)+"' y='"+(y+h/2)+"'/>"; // bottom/right
            	getElement('handles').innerHTML+=html;
            	setSizes('box',el.getAttribute('spin'),w,h);
            	showInfo(true,(w==h)?'CIRCLE':'OVAL',el.getAttribute('layer'));
            	node=0; // default anchor node
            	mode='edit';
            	/*
            	// var elementNodes=nodes.filter(function(node) {
        			return (Math.floor(node.n/10)==el.id);
    			});
    			console.log('element '+el.id+' has '+elNodes.length+' nodes');
    			for(var i=0;i<elNodes.length;i++) {
    				console.log('node '+i+' '+Math.floor(elNodes[i].x)+','+Math.floor(elNodes[i].y)+' #'+elNodes[i].n);
    			}
            	*/
            	break;
        	case 'arc':
            	var d=el.getAttribute('d');
            	// console.log('select arc - d: '+d);
            	getArc(d); // derive arc geometry from d
            	html="<use id='sizer1' href='#sizer' x='"+arc.x1+"' y='"+arc.y1+"'/>"; // sizers at start...
            	html+="<use id='sizer2' href='#sizer' x='"+arc.x2+"' y='"+arc.y2+"'/>"; // ...and end or arc
            	if(snapNode) html+="<use id='mover"+snapNode.n%10+"' href='#mover' x='"+snapNode.x+"' y='"+snapNode.y+"'/>"; // mover at a node
            	else html+="<use id='mover0' href='#mover' x='"+arc.cx+"' y='"+arc.cy+"'/>"; // mover at centre
            	getElement('handles').innerHTML+=html;
            	var a1=Math.atan((arc.y1-arc.cy)/(arc.x1-arc.cx));
            	if(arc.x1<arc.cx) a1+=Math.PI;
            	var a=Math.atan((arc.y2-arc.cy)/(arc.x2-arc.cx));
            	// console.log('end angle: '+a);
            	if(arc.x2<arc.cx) a+=Math.PI;
            	x0=arc.cx; // centre
            	y0=arc.cy;
            	x=x0+arc.r*Math.cos(a); // end point
	            y=y0+arc.r*Math.sin(a);
    	        a=Math.abs(a-a1); // swept angle - radians
        	    a*=180/Math.PI; // degrees
            	a=Math.round(a);
	            if(arc.major>0) a=360-a;
    	        setSizes('arc',el.getAttribute('spin'),arc.r,a);
        	    showInfo(true,'ARC',el.layer);
            	mode='edit';
	            break;
    	    case 'text':
        	    var bounds=el.getBBox();
            	w=Math.round(bounds.width);
	            h=Math.round(bounds.height);
	            // console.log('bounds: '+bounds.x+','+bounds.y+' - '+w+'x'+h+'; layer: '+elementLayers);
        	    var html="<use id='mover0' href='#mover' x='"+bounds.x+"' y='"+bounds.y+"'/>";
	            getElement('handles').innerHTML+=html; // circle handle moves text
	            var t=element.innerHTML;
	            // console.log('text: '+t);
	            var content='';
	            if(t.startsWith('<')) {
	            	i=0;
	            	while(i<t.length) {
	            		while(t.charAt(i)!='>') i++;
	            		i++;
	            		if(t.charAt(i)=='<') content+='\n';
	            		while((i<t.length)&&(t.charAt(i)!='<')) content+=t.charAt(i++);
	            	}
	            }
	            else content=t;
	            getElement('text').value=content;
            	setSizes('text',el.getAttribute('spin'),w,h);
            	showInfo(true,'TEXT',elementLayers);
            	showDialog('textDialog',true);
            	node=0; // default anchor node
        	    mode='edit';
            	break;
	        case 'dim':
    	        var line=el.firstChild;
        	    var x1=parseInt(line.getAttribute('x1'));
            	var y1=parseInt(line.getAttribute('y1'));
	            var x2=parseInt(line.getAttribute('x2'));
    	        var y2=parseInt(line.getAttribute('y2'));
        	    var spin=el.getAttribute('transform');
            	// console.log('dim from '+x1+','+y1+' to '+x2+','+y2);
    	        var html="<use id='mover0' href='#mover' x='"+((x1+x2)/2)+"' y='"+((y1+y2)/2)+"' "; 
        	    html+="transform='"+spin+"'/>";
            	getElement('handles').innerHTML+=html;
    	        mode='edit';
        	    break;
	        case 'set':
    	        var bounds=getBounds(el);
        	    x=Number(el.getAttribute('x'));
            	y=Number(el.getAttribute('y'));
	            w=Number(bounds.width);
    	        h=Number(bounds.height);
	            var html="<use id='mover0' href='#mover' x='"+x+"' y='"+y+"'/>";
    	        getElement('handles').innerHTML=html;
        	    setSizes('box',el.getAttribute('spin'),w,h);
            	showInfo(true,'SET',el.layer);
	            mode='edit';
    	        break;
    	    case 'image':
            	var bounds=getBounds(el);
        	    x=Number(el.getAttribute('x'));
            	y=Number(el.getAttribute('y'));
	            w=Number(bounds.width);
    	        h=Number(bounds.height);
            	// console.log('height: '+h);
            	getElement('blueBox').setAttribute('x',x); // SET blueBox TO MATCH BOX (WITHOUT SPIN)
            	getElement('blueBox').setAttribute('y',y);
            	getElement('blueBox').setAttribute('width',w);
            	getElement('blueBox').setAttribute('height',h);
            	getElement('guides').style.display='block';
    	    	var html="<use id='mover0' href='#mover' x='"+x+"' y='"+y+"'/>"; // mover - top/left
            	html+="<use id='sizer1' href='#sizer' x='"+(x+w)+"' y='"+(y+h)+"'/>"; // sizer - bottom/right
            	getElement('handles').innerHTML+=html;
            	setSizes('image',el.getAttribute('spin'),w,h);
            	showInfo(true,'IMAGE',el.layer);
            	node=0; // default anchor node
            	mode='edit';
    	    	break;
    	};
	}
}
function setButtons() {
    var n=selection.length;
    // console.log('set buttons for '+n+' selected elements');
    var active=[3,9,11,13,17,25,29]; // active - remove, move, spin, flip, copy, anchor & return buttons always active
    // childNodes of editTools are... 0:add 1:remove 2:forward 3:back 4:move 5:spin 6:flip 7:align 8:copy 9:double 10:repeat 11:fillet 12: anchor 13:join
    if(n>1) { // multiple selection
        if(anchor) { // join active if anchor available for multiple selection
            active.push(27);
        }
        active.push(15); // align and anchor active for multiple selection
    }
    else { // single element selected
    	active.push(19,21); // double and repeat only for single selection
        var t=type(getElement(selection[0]));
        if((t=='line')||(t=='shape')) active.push(1); // can add points to selected line/shape
        else if(t=='box') active.push(23); // fillet tool active for a selected box
        if(selectedPoints.length<1) { // unless editing line/shape active tools include...
            active.push(5); // push/pull back/forwards
            active.push(7);
            active.push(11); // spin and flip
            active.push(13);
            active.push(19); // double, repeat and anchor
            active.push(25);
        } 
    }
    if(n>1) getElement('info').style.height=0;
    var set='';
    for(i=0;i<active.length;i++) set+=active[i]+' ';
    var n=getElement('editTools').childNodes.length;
    for(var i=0;i<n;i++) {
        var btn=getElement('editTools').childNodes[i];
        // console.log(i+' '+btn.id+': '+(active.indexOf(i)>=0));
        getElement('editTools').childNodes[i].disabled=(active.indexOf(i)<0);
    }
}
function setLayer() {
	// console.log('set element layer(s)');
	var elementLayers='';
	for(var i=0;i<10;i++) {
		if(getElement('choice'+i).checked) elementLayers+=i;
	}
	getElement('layers').innerText=elementLayers;
	element.setAttribute('layer',elementLayers);
	updateGraph(element.id,['layer',elementLayers]);
}
function setLayers() {
	// console.log('set layers');
	for(var i=0;i<10;i++) {
		// console.log('layer '+i+' name: '+layers[i].name+' chosen: '+layers[i].checked+' show: '+layers[i].show);
		if(getElement('layer'+i).checked) layer=i;
		layers[i].name=getElement('layerName'+i).value; // getElement('layerName'+i).value=layers[i].name=layers[i].name;
		layers[i].show=getElement('layerCheck'+i).checked;
		getElement('choiceName'+i).innerText=layers[i].name;
		getElement('layer').innerText=layer;
	}
	// console.log('layers:'+layers);
	setLayerVisibility();
}
function setLayerVisibility() {
	// console.log('set layer visibilities');
	for(var i=0;i<10;i++) {
		// console.log('layer '+i+' show? '+getElement('layerCheck'+i).checked);
		layers[i].show=getElement('layerCheck'+i).checked;
	}
	var children=getElement('dwg').children;
	for(i=0;i<children.length;i++) {
		var elementLayers=children[i].getAttribute('layer'); // !!!!!!!!!!!!!!!!
		// console.log('child '+i+'; id: '+children[i].id+'; layers: '+elementLayers);
		var show=false;
		for(var n=0;n<elementLayers.length;n++) {
			var l=Number(elementLayers.charAt(n));
			if(layers[l].show) show=true;
		}
		children[i].style.display=(show)?'block':'none';
	}
	var data={};
    data.layers=[];
    for(i=0;i<10;i++) {
    	data.layers[i]={};
    	data.layers[i].name=layers[i].name;
    	data.layers[i].show=layers[i].show;
    	data.layers[i].checked=getElement('layer'+i).checked;
    }
	var json=JSON.stringify(data);
	// console.log('layers JSON: '+json);
	window.localStorage.setItem('layers',json);
}
function setLineType(g) {
    if(g.lineType=='dashed') return (4*g.lineW)+" "+(4*g.lineW);
    else if(g.lineType=='dotted') return g.lineW+" "+g.lineW;
}
function setSizes(mode,spin,p1,p2,p3,p4) {
    // console.log('setSizes - '+mode+','+p1+','+p2+','+p3+','+p4+' spin '+spin);
    if((mode=='box')||(mode=='oval')) {
        getElement('first').value=Math.round(p1);
        getElement('between').innerHTML='x';
        getElement('second').value=Math.round(p2);
        getElement('after').innerHTML='mm';
    }
    else if(mode=='polar') { // drawing line or arc
        var h=p3-p1;
        var v=p4-p2;
        var d=Math.round(Math.sqrt(h*h+v*v));
        var a=Math.atan(v/h); // radians
        a=Math.round(a*180/Math.PI); // degrees
        a+=90; // from North
        if(p3<p1) a+=180;
        getElement('first').value=d;
        getElement('between').innerHTML='mm';
        getElement('second').value=a;
        getElement('after').innerHTML='&deg;';
    }
    else { // arc
        getElement('first').value=Math.round(p1); // radius
        getElement('between').innerHTML='mm';
        getElement('second').value=Math.round(p2); // angle of arc
        getElement('after').innerHTML='&deg;';
    }
    getElement('spin').value=spin;
}
function setStyle() {
	// console.log('setStyle: '+selection.length+' items selected');
	// default style settings
    getElement('lineType').value=lineType;
    getElement('line').style.borderBottomStyle=lineType;
    getElement('line').style.borderWidth=pen+'mm';
    getElement('lineStyle').value=lineStyle;
    getElement('penSelect').value=pen;
    getElement('lineColor').style.backgroundColor=lineColor;
    getElement('line').style.borderColor=lineColor;
    // console.log('default text: '+textFont+','+textStyle+','+textSize+','+lineColor);
    getElement('textFont').value=textFont;
    getElement('textStyle').value=textStyle;
    getElement('textSize').value=textSize;
    getElement('fillType').value=fillType;
    getElement('fillColor').style.backgroundColor=fillColor;
    if(fillType=='solid') getElement('fill').style.backgroundColor=fillColor;
    getElement('fill').style.opacity=opacity;
    getElement('patternOption').disabled=true;
    getElement('opacity').value=opacity;
    // set styles to suit selected element?
    var el=(selection.length==1)?getElement(selection[0]):null;
    if(!el) return; // no selection or multiple selection
    var t=type(el);
    if((t=='set')||(t=='dim')||(t=='image')) return; 
    // console.log('set style for element '+el.id);
    val=getLineType(el);
    getElement('lineType').value=val;
    getElement('line').style.borderBottomStyle=val;
    val=el.getAttribute('stroke-linecap');
    // console.log('element lineStyle '+val+'; current lineStyle: '+getElement('lineStyle').value);
    if(val) {
    	if(val=='butt') getElement('lineStyle').value='square';
    	else getElement('lineStyle').value='round';
    }
    val=el.getAttribute('stroke-width');
    // console.log('pen: '+val);
    if(val) {
        getElement('line').style.borderWidth=(val/scaleF)+'px';
        val=Math.floor(val/10);
        if(val>3) val=3;
        // console.log('select option '+val);
        getElement('penSelect').options[val].selected=true;
    }
    val=el.getAttribute('stroke');
    if(val) {
        getElement('lineColor').style.backgroundColor=val;
        getElement('line').style.borderColor=val;
    }
    getElement('patternOption').disabled=false;
    val=el.getAttribute('fillType');
    // console.log('fillType: '+val);
    if(val.startsWith('pattern')) {
    	getElement('fillType').value='pattern';
    	getElement('fillColor').style.backgroundColor=getElement('pattern'+el.id).firstChild.getAttribute('fill');
    }
    else if(val=='none') {
    	getElement('fill').style.background='#00000000';
    	getElement('fillType').value='none';
    }
    else {
    	getElement('fillType').value='solid';
    	val=el.getAttribute('fill');
    	// console.log('fill color: '+val);
        if(type(el)=='text') {
            getElement('lineColor').style.backgroundColor=val;
        }
        else {
            getElement('fillColor').style.backgroundColor=val;
            getElement('fill').style.background=val;
        }
    }
    val=el.getAttribute('fill-opacity');
    if(val) {
    	getElement('opacity').value=val;
        getElement('fill').style.opacity=val;
    }
    if(type(el)=='text') {
        val=el.getAttribute('font-family');
        // console.log('text font: '+val);
      	if(!val || val=='undefined') val=textFont;
       	if(val) getElement('textFont').value=val;
        val=el.getAttribute('font-size')/scale;
        // console.log('text size: '+val);
        getElement('textSize').value=val;
        getElement('textStyle').value='fine';
        val=el.getAttribute('font-style');
        if(val=='italic') getElement('textStyle').value='italic';
        val=el.getAttribute('font-weight');
        if(val=='bold') getElement('textStyle').value='bold';
        getElement('patternOption').disabled=true;
        getElement('patternOption').disabled=true;
    } 
}
function setTransform(el) {
    // console.log('set transform for element '+el.id);
    var spin=parseInt(el.getAttribute('spin'));
    var flip=el.getAttribute('flip');
    // console.log('set spin to '+spin+' degrees and flip to '+flip+' for '+type(el));
    switch(type(el)) {
        case 'line':
        case 'shape':
            x=parseInt(el.points[0].x);
            y=parseInt(el.points[0].y);
            break;
        case 'box':
            x=parseInt(el.getAttribute('x')); // +parseInt(el.getAttribute('width'))/2;
            y=parseInt(el.getAttribute('y')); // +parseInt(el.getAttribute('height'))/2;
            break;
        case 'text':
        case 'set':
            x=parseInt(el.getAttribute('x'));
            y=parseInt(el.getAttribute('y'));
            break;
        case 'oval':
        case 'arc':
            x=parseInt(el.getAttribute('cx'));
            y=parseInt(el.getAttribute('cy'));
    }
    // console.log('x,y: '+x+','+y);
    var t='';
    if(flip) {
        var hor=flip&1;
        var ver=flip&2;
        t='translate('+(hor*x*2)+','+(ver*y)+') ';
        t+='scale('+((hor>0)? -1:1)+','+((ver>0)? -1:1)+')';
    }
    if(spin!=0) t+='rotate('+spin+','+x+','+y+')';
    el.setAttribute('transform',t);
    refreshNodes(el);
}
function showDialog(dialog,visible) {
    // console.log('show dialog '+dialog);
    if(currentDialog) getElement(currentDialog).style.display='none'; // hide any currentDialog
    getElement('colorPicker').style.display='none';
    getElement(dialog).style.display=(visible)?'block':'none'; // show/hide dialog
    currentDialog=(visible)?dialog:null; // update currentDialog
}
function showColorPicker(visible,x,y) {
    // console.log('show colorPicker');
    if(x) {
        getElement('colorPicker').style.left=x+'px';
        getElement('colorPicker').style.top=y+'px';
    }
    getElement('colorPicker').style.display=(visible)?'block':'none';
}
function showEditTools(visible) {
    if(visible) {
        getElement('tools').style.display='none';
        getElement('editTools').style.display='block';
    }
    else {
        getElement('editTools').style.display='none';
        getElement('tools').style.display='block';
    }
}
function showInfo(visible,type,layer,hint) {
	// console.log((visible)?'show info':'hide info');
	if(!visible) {
		getElement('info').style.top='-30px';
		return;
	}
	// console.log(type+'; '+layer+'; '+hint);
	getElement('type').innerText=type;
	getElement('layers').innerText=layer;
	getElement('info').style.top='0px';
	if(!hint) getElement('info').style.height='30px';
	else {
		getElement('info').style.height='50px';
		getElement('hint').innerText=hint;
		setTimeout(function(){getElement('info').style.height='30px';},10000);
	}
}
function snapCheck() {
    var near=nodes.filter(function(node) {
        return (Math.abs(node.x-x)<snapD)&&(Math.abs(node.y-y)<snapD);
    });
    if(near.length) { // snap to nearest node...
        var min=snapD*2;
        for(var i=0;i<near.length;i++) {
            var d=Math.abs(near[i].x-x)+Math.abs(near[i].y-y);
            if(d<min) {
                min=d;
                snap={'x':near[i].x,'y':near[i].y,'n':near[i].n};
            }
        }
        // console.log('SNAP x: '+snap.x+' y: '+snap.y+' n: '+snap.n);
        if(snap.n!=datum2.n) {
            datum1.x=datum2.x;
            datum1.y=datum2.y;
            datum1.n=datum2.n;
            getElement('datum1').setAttribute('x',datum1.x);
            getElement('datum1').setAttribute('y',datum1.y);
            // console.log('DATUM1: '+datum1.n+' at '+datum1.x+','+datum1.y);
            datum2.x=snap.x;
            datum2.y=snap.y;
            datum2.n=snap.n;
            getElement('datum2').setAttribute('x',datum2.x);
            getElement('datum2').setAttribute('y',datum2.y);
            // console.log('DATUM2: '+datum2.n+' at '+datum2.x+','+datum2.y);
        }
        x=snap.x;
        y=snap.y;
        return snap;
    }
    else { // if no nearby nodes...
        if(Math.abs(x-datum.x1)<snapD) x=datum.x1;
        else if(Math.abs(x-datum.x2)<snapD) x=datum.x2;
        else if(gridSnap>0) x=Math.round(x/gridSize)*gridSize;
        if(Math.abs(y-datum.y1)<snapD) y=datum.y1;
        else if(Math.abs(y-datum.y2)<snapD) y=datum.y2;
        else if(gridSnap>0) y=Math.round(y/gridSize)*gridSize;
        return false;
    }
}
function swopGraphs(g1,g2) {
    // console.log('swop graphs '+g1+' and '+g2);
    g1=Number(g1);
    g2=Number(g2);
    var graph1={};
    var graph2={};
    var transaction=db.transaction('graphs','readwrite');
    var graphs=transaction.objectStore('graphs');
    var request=graphs.get(g1);
    request.onsuccess=function(event) {
        graph1=request.result;
        // console.log('got graph: '+graph1.id);
        request=graphs.get(g2);
        request.onsuccess=function(event) {
            graph2=request.result;
            // console.log('got graph: '+graph2.id);
            var tempID=graph1.id;
            graph1.id=graph2.id;
            graph2.id=tempID;
            // console.log('IDs swopped');
            request=graphs.put(graph1);
            request.onsuccess=function(event) {
                // console.log('g1 saved');
                request=graphs.put(graph2);
                request.onsuccess=function(event) {
                    console.log('g2 saved');
                }
            }
        }
        request.onerror=function(event) {
            console.log('error getting graph2 to swop');
        }
    }
    request.onerror=function(event) {
        console.log('error getting graph1 to swop');
    }
    transaction.oncomplete=function(event) {
        console.log('swop complete');
    }
}
function textFormat(text,across) {
	var chars=text.length;
	// console.log('text: '+text+' - '+chars+' characters');
	var content='';
	var rows=[];
	var row=0;
	var i=0;
	// console.log('across: '+across);
	while(i<chars) {
		rows[row]="<tspan x='"+across+"' dy='1.2em'>"
		while((i<chars)&&(text.charAt(i)!='\n')) {
			rows[row]+=text.charAt(i);
			i++;
		}
		rows[row]+="</tspan>";
		// console.log('row '+row+': '+rows[row]);
		content+=rows[row];
		row++;
		i++;
	}
	// console.log('text content: '+content);
	return content;
}
function type(el) {
	if(el instanceof(SVGPathElement)) {
		var d=el.getAttribute('d');
		// console.log('d:'+d);
		if(d.indexOf('Q')>0) return 'curve';
		else return 'arc';
	}
    else if(el instanceof SVGPolylineElement) {
        return 'line';
    }
    else if(el instanceof SVGPolygonElement) {
        return'shape';
    }
    else if(el instanceof SVGRectElement) {
        return 'box';
    }
    else if(el instanceof SVGEllipseElement) {
        return 'oval';
    }
    else if(el instanceof SVGTextElement) {
        return 'text';
    }
    else if(el instanceof SVGGElement) {
        return 'dim';
    }
    else if(el instanceof SVGSVGElement) {
        return 'set';
    }
    else if(el instanceof SVGCircleElement) {
        return 'anchor';
    }
    else if(el instanceof SVGUseElement) {
        return 'set';
    }
    else if(el instanceof SVGImageElement) {return 'image';}
}
function updateGraph(id,parameters,textElement) {
	// console.log('update graph '+id+'... '+parameters);
	var graphs=db.transaction('graphs','readwrite').objectStore('graphs');
	var request=graphs.get(Number(id));
	request.onsuccess=function(event) {
	    var graph=request.result;
	    // console.log('got graph '+graph.id);
	    while(parameters.length>0) {
	        var attribute=parameters.shift();
	        var val=parameters.shift();
	        // console.log('set '+attribute+' to '+val);
	        eval('graph.'+attribute+'="'+val+'"');
	    }
	    // if(graph.type=='text') console.log('text: '+graph.text)
	    request=graphs.put(graph);
	    request.onsuccess=function(event) {
			    // console.log('graph '+id+' updated');
			    if(graph.type=='text') {
			    	document.getElementById(id).innerHTML=textFormat(graph.text,graph.x);
			    }
		};
		request.onerror=function(event) {
		    console.log("PUT ERROR updating graph "+id);
		};
	}
	request.onerror=function(event) {console.log('error updating '+id);};
}
// START-UP CODE
var request=window.indexedDB.open("LinesDB",dbVersion);
request.onsuccess=function(event) {
    db=event.target.result;
    load();
};
request.onupgradeneeded=function(event) {
    var db=event.target.result;
    if (!db.objectStoreNames.contains('graphs')) {
        var graphs=db.createObjectStore('graphs',{keyPath:'id',autoIncrement:true});
    }
    if (!db.objectStoreNames.contains('sets')) {
        var sets=db.createObjectStore("sets",{keyPath:'name'});
    }
    if (!db.objectStoreNames.contains('images')) {
        var sets=db.createObjectStore("images",{keyPath:'name'});
    }
};
request.onerror=function(event) {
	alert("indexedDB error");
};
// SERVICE WORKER
if (navigator.serviceWorker.controller) {
	console.log('Active service worker found, no need to register')
}
else { //Register the ServiceWorker
	navigator.serviceWorker.register('sw.js').then(function(reg) {
		console.log('Service worker has been registered for scope:'+ reg.scope);
	});
}
var pattern=[];
var tile=[];
pattern[0]={'width':4, 'height':2, 'spin':0, 'tile':0};
pattern[1]={'width':4, 'height':2, 'spin':90, 'tile':0};
pattern[2]={'width':4, 'height':2, 'spin':0, 'tile':1};
pattern[3]={'width':4, 'height':2, 'spin':90, 'tile':1};
pattern[4]={'width':2, 'height':2, 'spin':0, 'tile':2};
pattern[5]={'width':4, 'height':2, 'spin':-45, 'tile':0};
pattern[6]={'width':4, 'height':2, 'spin':45, 'tile':0};
pattern[7]={'width':4, 'height':2, 'spin':-45, 'tile':1};
pattern[8]={'width':4, 'height':2, 'spin':45, 'tile':1};
pattern[9]={'width':2, 'height':2, 'spin':45, 'tile':2};
pattern[10]={'width':1, 'height':1, 'spin':0, 'tile':3};
pattern[11]={'width':4, 'height':4, 'spin':0, 'tile':4};
pattern[12]={'width':1, 'height':1, 'spin':0, 'tile':5};
pattern[13]={'width':2, 'height':2, 'spin':0, 'tile':6};
pattern[14]={'width':1, 'height':1, 'spin':45, 'tile':6};

tile[0]='<rect x="0" y="1" width="4" height="0.5" stroke="none"/>';
tile[1]='<rect x="0" y="1" width="4" height="1" stroke="none"/>';
tile[2]='<rect x="0" y="1" width="2" height="0.5" stroke="none"/><rect x="1" y="0" width="0.5" height="2" stroke="none"/>';
tile[3]='<rect x="0" y="0" width="0.5" height="0.5" stroke="none"/><rect x="0.5" y="0.5" width="0.5" height="0.5" stroke="none"/>'
tile[4]='<rect x="0" y="0" width="2" height="2" stroke="none"/><rect x="2" y="2" width="2" height="2" stroke="none"/>';
tile[5]='<circle cx="0.5" cy="0.5" r="0.25" stroke="none"/>';
tile[6]='<circle cx="1" cy="1" r="0.5" stroke="none"/>';
