import evernote
import evernote.api.client
import evernote.edam
import http.server
import json

# Initialize Evernote connection
configfile = "./config"
with open(configfile) as fd:
	config = json.load(fd)

enClient = evernote.api.client.EvernoteClient(token=config['authToken'], sandbox=False)
noteStore = enClient.get_note_store()

def getTags(notestore, nbguid):
	tags = {}
	for t in notestore.listTagsByNotebook(nbguid):
		tags[t.guid] = t.name
	return tags

def getNotes(notestore, nbguid):
	noteFilter = evernote.edam.notestore.ttypes.NoteFilter()
	noteMetaResultSpec = evernote.edam.notestore.ttypes.NotesMetadataResultSpec()
	noteMetaResultSpec.includeTitle = True
	noteMetaResultSpec.includeTagGuids = True
	noteFilter.notebookGuid = config['notebookGuid']
	notes = []
	#for note in noteStore.findNotes(noteFilter, 0, 200).notes:
	for note in notestore.findNotesMetadata(noteFilter, 0, 200, noteMetaResultSpec).notes:
		n = {}
		n['guid'] = note.guid
		n['title'] = note.title
		n['tagGuids'] = note.tagGuids
		notes.append(n)
	return notes

tags = getTags(noteStore, config['notebookGuid'])
notes = getNotes(noteStore, config['notebookGuid'])

class EvernoteHTTPRequestHandler(http.server.BaseHTTPRequestHandler):
	# A simple ad-hoc controller
	def do_GET(self):
		if self.path == '/':
			self.send_response(200)
			self.end_headers()
			with open("index.html") as fd:
				self.wfile.write(bytes(fd.read(), "utf-8"))

		# A pretty generic file route
		if self.path in ['/listNotes.html', '/listNotes.js', '/networkNotes.html', '/networkNotes.js', "/stylesheet.css"]:
			self.send_response(200)
			self.end_headers()
			with open("." + self.path) as fd:
				self.wfile.write(bytes(fd.read(), "utf-8"))

		if self.path == '/listNotebooks':
			self.send_response(200)
			self.send_header("Content-type", "application/json")
			self.end_headers()
			for notebook in noteStore.listNotebooks():
				self.wfile.write(bytes(notebook.name, "utf-8"))

		if self.path == '/listNotes':
			self.send_response(200)
			self.send_header("Content-type", "application/json")
			self.end_headers()
			#self.wfile.write(json.dump(notes))
			data = {}
			data['tags'] = tags
			data['notes'] = notes
			self.wfile.write(bytes(json.dumps(data), "utf-8"))

# Run the server, with serve_forever() eventually
# http.server.HTTPServer(('', 8000), EvernoteHTTPRequestHandler).handle_request()
http.server.HTTPServer(('', 8000), EvernoteHTTPRequestHandler).serve_forever()
