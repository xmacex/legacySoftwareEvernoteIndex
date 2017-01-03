var notes = [];

d3.json("http://localhost:8000/listNotes", function(error, data) {
	if(error) {
		console.log(error)
	}
	notes = data;
	console.log(notes);
	d3.select("div#content").selectAll("div.note")
		.data(data)
		.enter()
		.append("div")
		.attr("id", function(d) {return d.guid})
		.attr("class", "note")
		.html(function(d) {
			return "<h2>" + d.guid + "</h2>" + d.title
		})
})
