$(document).ready(function() {
(function(threadviewer) {
	
	var StackTraceEntry = threadviewer.StackTraceEntry = Backbone.Model.extend({
		className : "unknown",
		methodName : "unknown",
		lineNumber : 0,
		description: ""
	});

	var StackTrace = threadviewer.StackTrace = Backbone.Collection.extend({
		model : StackTraceEntry
	});
	
	var Thread = threadviewer.Thread = Backbone.Model.extend({
		initialize: function(options) {
			if (options.stackTrace) {
				var stackTraceModels = [];
				for (var i in options.stackTrace) {
					stackTraceModels.push(new StackTraceEntry(options.stackTrace[i]));
				}
				this.stackTrace.reset(stackTraceModels);
			}
		},
		id: "",
		name : "unknown",
		state : "unknown",
		selected : false,
		stackTrace : new StackTrace(),
		toggleSelected: function() {
			this.set("selected", !this.get("selected"));
		},
		interrupt: function() {
			var self = this;
			$.getJSON(threadviewer.rootPath + "/interrupt/" + this.id, function(threadDefs) {
				self.get("appModel").updateThreadList(threadDefs);
			});
		}
	});
	
	var ApplicationModel = threadviewer.ApplicationModel = Backbone.Model.extend({
		threadList : null,
		threadStateSummary : "",
		initialize : function(options) {
			var self = this;
			options.threadList.on("reset", function(newThreadList) {
				self.set("threadStateSummary", "Summary: " + newThreadList.length + " threads");
			});
			threadviewer.router.on("route:displayThreads", function(e) {
				if (e === "all") {
					self.setAllSelected(true);
				} else {
					var threadIdList = e.split("-");
					self.set("openedStacktraces", threadIdList);
				}
			});
		},
		openedStacktraces: [],
		allSelected: false,
		updateThreadList : function(threadDefinitions) {
			var self = this;
			this.get("threadList").forEach(function(thread) {
				thread.off(null, null, self);
			});
			var newThreads = [];
			for (var i in threadDefinitions) {
				var threadDef = threadDefinitions[i];
				var newThread = new threadviewer.Thread(threadDef);
				newThread.set("appModel", this);
				newThread.on("change:selected", this.updateNavigation, this);
				newThreads.push(newThread);
			}
			this.get("threadList").reset(newThreads);
			if (this.get("allSelected")) {
				var newOpenedStacktraces = [];
				this.get("threadList").forEach(function(thread) {
					thread.set("selected", true);
					newOpenedStacktraces.push(thread.get("id"));
				});
				this.set("openedStacktraces", newOpenedStacktraces);
			} else {
				var opened = this.get("openedStacktraces");
				if (opened !== undefined) {
					opened.forEach(function(threadId) {
						var thread = self.get("threadList").findWhere({
							id : parseInt(threadId, 10)
						});
						if (thread !== undefined) {
							thread.set("selected", true);
						}
					});
				}
			}
		},
		setAllSelected : function(selected) {
			this.get("threadList").forEach(function(thread) {
				thread.set("selected", selected);
			});
			this.set("allSelected", selected);
		},
		toggleAllSelected: function() {
			this.setAllSelected(!this.get("allSelected"));
		},
		updateNavigation: function() {
			var selectedThreads = this.get("threadList").where({selected: true});
			if (selectedThreads.length === this.get("threadList").length) {
				threadviewer.router.navigate("all", {replace: true});
			} else {
				var selectedThreadIds = [];
				selectedThreads.forEach(function (thread) {
					selectedThreadIds.push(thread.get("id"));
				});
				threadviewer.router.navigate(selectedThreadIds.join("-"), {replace: true});
			}
		},
		refreshThreadList: function() {
			var self = this;
			$.getJSON(threadviewer.rootPath + "/threadlist.json", function(threadDefs) {
				self.updateThreadList(threadDefs);
			});
		}
	});
	
	var ThreadList = threadviewer.ThreadList = Backbone.Collection.extend({
		model : Thread,
		getThreadByName : function(threadName) {
			return this.findWhere({name : threadName});
		}
	});

})(window.threadviewer);
});
