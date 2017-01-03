var tags = {};
var notes = [];
var graph = {'nodes': [], 'edges': []};
var tagUi = d3.select("div#tagUi");
var notesUi = d3.select("div#noteUi");
var graphWidth = window.innerWidth - 600;
var graphHeight = window.innerHeight;
var svg = d3.select("div#graph").append("svg")
	.attr("height", graphWidth)
	.attr("width", graphHeight);

var force = d3.forceSimulation()
	.force("link", d3.forceLink().id(function(d) {return d.guid;}))
	.force("charge", d3.forceManyBody().strength(-30))
	.force("center", d3.forceCenter(graphWidth / 2, graphHeight / 2));

function dragstarted(d) {
	// this breaks showing labels while dragging
	// d3.select(this).classed("dragging", true)
	if (!d3.event.active) force.alphaTarget(0.3).restart();
	d.fx = d.x;
	d.fy = d.y;
}

function dragged(d) {
	d.fx = d3.event.x;
	d.fy = d3.event.y;
}

function dragended(d) {
	// d3.select(this).classed("dragging", false)
	if (!d3.event.active) force.alphaTarget(0);
	d.fx = null;
	d.fy = null;
}

function showlabel(d) {
	d3.selectAll(".labels text")
		.filter(l => l.guid == d.guid)
		.style("display", "block")
}

function hidelabel(d) {
	d3.selectAll(".labels text")
		.filter(l => l.guid == d.guid)
		.style("display", "none")
}

var t = "";

function highlight(d) {
	t = d;
	d3.select(this).classed("highlight", true)
	d3.selectAll(".tagButton").filter(b => b == d).classed("highlight", true);
	d3.selectAll(".nodes circle").filter(n => n == d).classed("highlight", true);

	d3.selectAll(".edges line")
		.filter(e => e.target == d)
		.classed("highlight", true)
	d3.selectAll(".edges line")
		.filter(e => e.source == d)
		.classed("highlight", true);

	// neig. nodes, plus ego
	var neighbourhood = [];
	neighbourhood = neighbourhood.concat(graph.edges.filter(e => e.source == d).map(l => l.target));
	neighbourhood = neighbourhood.concat(graph.edges.filter(e => e.target == d).map(l => l.source));
	console.log(neighbourhood);
	d3.selectAll(".nodes circle")
		.filter(l => neighbourhood.find(k => k == l))
		.classed("highlight", true)
		.each(showlabel)

	d3.selectAll(".tagButton")
		.filter(l => neighbourhood.find(k => k == l))
		.classed("highlight", true);

	d3.selectAll(".noteButton")
		.filter(l => neighbourhood.find(k => k == l))
		.classed("highlight", true);

	showlabel(d);
}

function unhighlight(d) {
	// might as well unhighlight everything, though
	d3.select(this).classed("highlight", false);
	d3.selectAll(".tagButton").classed("highlight", false);
	d3.selectAll(".noteButton").classed("highlight", false);
	d3.selectAll(".edges line")
		.filter(e => e.target == d)
		.classed("highlight", false);
	d3.selectAll(".edges line")
		.filter(e => e.source == d)
		.classed("highlight", false);
	d3.selectAll(".nodes circle")
		.classed("highlight", false)
		.each(hidelabel);
}

d3.json("http://localhost:8000/listNotes", function(error, data) {
    if(error) throw error; 
	tags = data.tags
    notes = data.notes;
	console.log(data);

	// these tags are leaking from other notebooks. Remove them
	// backend should do this, at the Evernote interface
	var leakedTags = ['ai', 'software studies', 'infrastructure studies']
	data.notes.forEach(function(n) {
		if(n.tagGuids) {
			n.tagGuids = n.tagGuids.filter(t => leakedTags.indexOf(data.tags[t]) === -1);
		}
	});

	// set up a graph
	// add nodes
	// FIXME duplicates are maybe going into the nodes list
	console.log("constructing nodes");
	data.notes.forEach(function(n) {
		graph['nodes'].push(n);
		if (n.tagGuids) { // is a note, not a tag
			n.tagGuids.forEach(function(t) {
				if(!graph.nodes.some(node => node.guid == t)) {
					graph['nodes'].push({"guid": t, "title": data.tags[t], "type": "tag"});
				}
			});
		}
	});
	//pruned = graph.nodes.filter(n => leakedTags.indexOf(n.title) === -1);
	//console.log(pruned);
	// graph.nodes = pruned;

	// add edges
	console.log("constructing edges");
	data.notes.forEach(function(n) {
		if (n.tagGuids) {
			n.tagGuids.forEach(function(t) {
				graph.edges.push({"source": graph.nodes.find(n => n.guid == t), "target": n});
			});
		}
	});

	console.log(graph);

	// tag UI selector thing
	tagUi.selectAll(".tagButton")
		.data(graph.nodes.filter(n => n.type == "tag"))
		.enter()
		.append("div")
		.attr("class", "tagButton")
		.html(d => {return d.title + ": " + graph.edges.filter(e => e.source == d).length})
		.on("mouseover", highlight)
		.on("mouseout", unhighlight)
	
	// graph
	var link = svg.append("g")
		.attr("class", "edges")
		.selectAll("line")
		.data(graph.edges)
		.enter()
		.append("line");

	var node = svg.append("g")
		.attr("class", "nodes")
		.selectAll("circle")
		.data(graph.nodes)
		.enter()
		.append("circle")
		.attr("class", function(d) {return d.type;})
		.attr("r", function(d) {return 5;})
		.on("mouseover", highlight)
		.on("mouseout", unhighlight)
		.call(d3.drag()
			.on("start", dragstarted)
			.on("drag", dragged)
			.on("end", dragended));

	var label = svg.append("g")
		.attr("class", "labels")
		.selectAll(".nodes")
		.data(graph.nodes)
		.enter()
		.append("text")
		.attr("class", function(d) {return d.type;})
		.text(function(d) {return d.title;})

	d3.selectAll("g.nodes circle")
		.data(graph.nodes)
		.enter()
		.attr("cx", 400)
		.attr("guid", function(d) {return d.guid})
		.text(function(d) {return d.title})

	force
		.nodes(graph.nodes)
		.on("tick", ticked);
	force
		.force("link")
		.links(graph.edges);

	function ticked() {
		link
			.attr("x1", function(d) {return d.source.x;})
			.attr("y1", function(d) {return d.source.y;})
			.attr("x2", function(d) {return d.target.x;})
			.attr("y2", function(d) {return d.target.y;});
		node
			.attr("cx", function(d) {return d.x;})
			.attr("cy", function(d) {return d.y;})
		label
			// ok this should be done with CSS/SVG attributes and classes
			.attr("x", function(d) {return d.x + (d.type == 'tag' ? -10 : 10)})
			.attr("y", function(d) {return d.y + 5;})

	// notes UI selector thing
	notesUi.selectAll(".noteButton")
		.data(graph.nodes.filter(n => n.type != "tag"))
		.enter()
		.append("div")
		.attr("class", "noteButton")
		.classed("orphan", d => graph.edges.filter(e => e.target == d).length == 0)
		.html(d => {return d.title + ": " + graph.edges.filter(e => e.target == d).length})
		.on("mouseover", highlight)
		.on("mouseout", unhighlight)
	};
});
