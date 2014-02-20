/*
 * JBoss, Home of Professional Open Source
 * Copyright 2013, Red Hat, Inc. and individual contributors
 * by the @authors tag. See the copyright.txt in the distribution for a
 * full listing of individual contributors.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */
(function($, rf) {

    rf.ui = rf.ui || {};

    rf.ui.FileUpload = function(id, options) {
        this.id = id;
        this.items = [];
        this.submitedItems = [];

        $.extend(this, options);
        if (this.acceptedTypes) {
            this.acceptedTypes = $.trim(this.acceptedTypes).toUpperCase().split(/\s*,\s*/);
        }
        if (this.maxFilesQuantity) {
            this.maxFilesQuantity = parseInt($.trim(this.maxFilesQuantity));
        }
        this.element = $(this.attachToDom());
        this.form = this.element.parents("form:first");
        var header = this.element.children(".rf-fu-hdr:first");
        var leftButtons = header.children(".rf-fu-btns-lft:first");
        this.addButton = leftButtons.children(".rf-fu-btn-add:first");
        this.uploadButton = this.addButton.next();
        this.clearButton = leftButtons.next().children(".rf-fu-btn-clr:first");
        this.inputContainer = this.addButton.find(".rf-fu-inp-cntr:first");
        this.input = this.inputContainer.children("input");
        this.list = header.next();
        this.list.bind('dragenter', function(e) {e.stopPropagation(); e.preventDefault();});
        this.list.bind('dragover', function(e) {e.stopPropagation(); e.preventDefault();});
        this.list.bind('drop', $.proxy(this.__addItemsFromDrop, this));

        this.hiddenContainer = this.list.next();
        //this.iframe = this.hiddenContainer.children("iframe:first");
        //this.progressBarElement = this.iframe.next();
        //this.progressBar = rf.component(this.progressBarElement);
        this.cleanInput = this.input.clone();
        this.addProxy = $.proxy(this.__addItems, this);
        this.input.change(this.addProxy);
        this.addButton.mousedown(pressButton).mouseup(unpressButton).mouseout(unpressButton);
        this.uploadButton.click($.proxy(this.__startUpload, this)).mousedown(pressButton)
            .mouseup(unpressButton).mouseout(unpressButton);
        this.clearButton.click($.proxy(this.__removeAllItems, this)).mousedown(pressButton)
            .mouseup(unpressButton).mouseout(unpressButton);
        //this.iframe.load($.proxy(this.__load, this));
        if (this.onfilesubmit) {
            rf.Event.bind(this.element, "onfilesubmit", new Function("event", this.onfilesubmit));
        }
        if (this.ontyperejected) {
            rf.Event.bind(this.element, "ontyperejected", new Function("event", this.ontyperejected));
        }
        if (this.onuploadcomplete) {
            rf.Event.bind(this.element, "onuploadcomplete", new Function("event", this.onuploadcomplete));
        }
        if (this.onclear) {
            rf.Event.bind(this.element, "onclear", new Function("event", this.onclear));
        }
        if (this.onfileselect) {
            rf.Event.bind(this.element, "onfileselect", new Function("event", this.onfileselect));
        }
    }

    var UID = "rf_fu_uid";
    var UID_ALT = "rf_fu_uid_alt";
    var FAKE_PATH = "C:\\fakepath\\";
    var ITEM_HTML = '<div class="rf-fu-itm">'
        + '<span class="rf-fu-itm-lft"><span class="rf-fu-itm-lbl"/><span class="rf-fu-itm-st"/></span>'
        + '<span class="rf-fu-itm-rgh"><a href="javascript:void(0)" class="rf-fu-itm-lnk"/></span></div>';

    var ITEM_STATE = {
        NEW: "new",
        UPLOADING: "uploading",
        DONE: "done",
        SIZE_EXCEEDED: "sizeExceeded",
        STOPPED: "stopped",
        SERVER_ERROR: "serverError"
    };

    var pressButton = function(event) {
        $(this).children(":first").css("background-position", "3px 3px").css("padding", "4px 4px 2px 22px");
    };

    var unpressButton = function(event) {
        $(this).children(":first").css("background-position", "2px 2px").css("padding", "3px 5px 3px 21px");
    };

    rf.BaseComponent.extend(rf.ui.FileUpload);


    function TypeRejectedException(fileName) {
        this.name = "TypeRejectedException";
        this.message = "The type of file " + fileName + " is not accepted";
        this.fileName = fileName;
    }

    $.extend(rf.ui.FileUpload.prototype, (function () {

        return {
            name: "FileUpload",

            doneLabel: "Done",
            sizeExceededLabel: "File size is exceeded",
            stoppedLabel: "",
            serverErrorLabel: "Server error",
            clearLabel: "Clear",
            deleteLabel: "Delete",

            __addFiles : function(files) {
                var context = {
                    acceptedFileNames: [],
                    rejectedFileNames: []
                };

                if (files) {
                    for (var i = 0 ; i < files.length; i++) {
                        this.__tryAddItem(context, files[i]);

                        if (this.maxFilesQuantity && (context.acceptedFileNames.length >= this.maxFilesQuantity)) {
                            this.addButton.hide();
                            break;
                        }
                    }
                } else {
                    var fileName = this.input.val();
                    this.__tryAddItem(context, fileName);
                }

                if (context.rejectedFileNames.length > 0) {
                    rf.Event.fire(this.element, "ontyperejected", context.rejectedFileNames.join(','));
                }

                if (this.immediateUpload) {
                    this.__startUpload();
                }
            },

            __addItems : function() {
                this.__addFiles(this.input.prop("files"));
            },

            __addItemsFromDrop: function(dropEvent) {
                dropEvent.stopPropagation();
                dropEvent.preventDefault();

                this.__addFiles(dropEvent.originalEvent.dataTransfer.files);
            },

            __tryAddItem: function(context, file) {
                try {
                    if (this.__addItem(file)) {
                        context.acceptedFileNames.push(file.name);
                    }
                } catch (e) {
                    if (e instanceof TypeRejectedException) {
                        context.rejectedFileNames.push(file.name);
                    } else {
                        throw e;
                    }
                }
            },

            __addItem: function(file) {
                var fileName = file.name;
                if (!navigator.platform.indexOf("Win")) {
                    fileName = fileName.match(/[^\\]*$/)[0];
                } else {
                    if (!fileName.indexOf(FAKE_PATH)) {
                        fileName = fileName.substr(FAKE_PATH.length);
                    } else {
                        fileName = fileName.match(/[^\/]*$/)[0];
                    }
                }
                if (this.__accept(fileName) && (!this.noDuplicate || !this.__isFileAlreadyAdded(fileName))) {
                    this.input.hide();
                    this.input.unbind("change", this.addProxy);
                    var item = new Item(this, file);
                    this.list.append(item.getJQuery());
                    this.items.push(item);
                    this.input = this.cleanInput.clone();
                    this.inputContainer.append(this.input);
                    this.input.change(this.addProxy);
                    this.__updateButtons();
                    rf.Event.fire(this.element, "onfileselect", fileName);
                    return true;
                }

                return false;
            },

            __removeItem: function(item) {
                this.items.splice($.inArray(item, this.items), 1);
                this.submitedItems.splice($.inArray(item, this.submitedItems), 1);
                this.__updateButtons();
                rf.Event.fire(this.element, "onclear", [item.model]);
            },

            __removeAllItems: function(item) {
                var itemsRemoved = [];
                for (var i in this.submitedItems) {
                    itemsRemoved.push(this.submitedItems[i].model);
                }
                for (var i in this.items) {
                    itemsRemoved.push(this.items[i].model);
                }
                this.list.empty();
                this.items.splice(0, this.items.length);
                this.submitedItems.splice(0, this.submitedItems.length);
                this.__updateButtons();
                rf.Event.fire(this.element, "onclear", itemsRemoved);
            },

            __updateButtons: function() {
                if (!this.loadableItem && this.list.children(".rf-fu-itm").size()) {
                    if (this.items.length) {
                        this.uploadButton.css("display", "inline-block");
                    } else {
                        this.uploadButton.hide();
                    }
                    this.clearButton.css("display", "inline-block");
                } else {
                    this.uploadButton.hide();
                    this.clearButton.hide();
                }
                if (this.maxFilesQuantity && this.__getTotalItemCount() >= this.maxFilesQuantity) {
                    this.addButton.hide();
                } else {
                    this.addButton.css("display", "inline-block");
                }
            },

            __startUpload: function() {
                if (!this.items.length) {this.__finishUpload; return;}
                //this.input.val("");
                this.loadableItem = this.items.shift();
                this.__updateButtons();
                this.loadableItem.startUploading();
            },

             __submit: function() {
                // var encodedURLInputs = this.form.children("input[name='javax.faces.encodedURL']");
                // var originalAction = encodedURLInputs.length > 0 ? encodedURLInputs.val() : this.form.attr("action");
                // var originalEncoding = this.form.attr("encoding");
                // var originalEnctype = this.form.attr("enctype");
                // try {
                    // var delimiter = originalAction.indexOf("?") == -1 ? "?" : "&";
                    // this.form.attr("action", originalAction + delimiter + UID + "=" + this.loadableItem.uid);
                    // this.form.attr("encoding", "multipart/form-data");
                    // this.form.attr("enctype", "multipart/form-data");
                 //rf.submitForm(this.form, {"org.richfaces.ajax.component": this.id}, this.id);
                 rf.Event.fire(this.element, "onfilesubmit", this.loadableItem.model);
                // } finally {
                    // this.form.attr("action", originalAction);
                    // this.form.attr("encoding", originalEncoding);
                    // this.form.attr("enctype", originalEnctype);
                    // this.loadableItem.input.removeAttr("name");
                // }
             },

            // __load: function(event) {
            //     console.log('__load() executed');
            //     if (this.loadableItem) {
            //         var contentDocument = event.target.contentWindow.document;
            //         contentDocument = contentDocument.XMLDocument || contentDocument;
            //         var documentElement = contentDocument.documentElement;
            //         var responseStatus, id;
            //         if (documentElement.tagName.toUpperCase() == "PARTIAL-RESPONSE") {
            //             var errors = $(documentElement).children("error");
            //             responseStatus = errors.length > 0 ? ITEM_STATE.SERVER_ERROR : ITEM_STATE.DONE;
            //         } else if ((id = documentElement.id) && id.indexOf(UID + this.loadableItem.uid + ":") == 0) {
            //             responseStatus = id.split(":")[1];
            //         }
            //         if (responseStatus) {
            //             var responseContext = {
            //                 source: this.element[0],
            //                 element: this.element[0],
            //                 /* hack for MyFaces */
            //                 _mfInternal: {
            //                     _mfSourceControlId: this.element.attr('id')
            //                 }
            //             };

            //             responseStatus == ITEM_STATE.DONE && jsf.ajax.response({responseXML: contentDocument}, responseContext);
            //             this.loadableItem.finishUploading(responseStatus);
            //             this.submitedItems.push(this.loadableItem);
            //             if (responseStatus == ITEM_STATE.DONE && this.items.length) {
            //                 this.__startUpload();
            //             } else {
            //                 this.loadableItem = null;
            //                 this.__updateButtons();
            //                 var items = [];
            //                 for (var i in this.submitedItems) {
            //                     items.push(this.submitedItems[i].model);
            //                 }
            //                 for (var i in this.items) {
            //                     items.push(this.items[i].model);
            //                 }
            //                 rf.Event.fire(this.element, "onuploadcomplete", items);
            //             }
            //         }
            //     }
            // },

            __accept: function(fileName) {
                fileName = fileName.toUpperCase();
                var result = !this.acceptedTypes;
                for (var i = 0; !result && i < this.acceptedTypes.length; i++) {
                    var extension = "." + this.acceptedTypes[i];

                    if (extension === "." && fileName.indexOf(".") < 0) {
                        // no extension
                        result = true;
                    } else {
                        result = fileName.indexOf(extension, fileName.length - extension.length) !== -1;
                    }
                }
                if (!result) {
                    throw new TypeRejectedException(fileName);
                }
                return result;
            },

            __isFileAlreadyAdded: function(fileName) {
                var result = false;
                for (var i = 0; !result && i < this.items.length; i++) {
                    result = this.items[i].model.name == fileName;
                }
                result = result || (this.loadableItem && this.loadableItem.model.name == fileName);
                for (var i = 0; !result && i < this.submitedItems.length; i++) {
                    result = this.submitedItems[i].model.name == fileName;
                }
                return result;
            },


            __getTotalItemCount : function() {
                return this.__getItemCountByState(this.items, ITEM_STATE.NEW)
                    + this.__getItemCountByState(this.submitedItems, ITEM_STATE.DONE)
            },

            __getItemCountByState : function(items) {
                var statuses = {}
                var s = 0;
                for ( var i = 1; i < arguments.length; i++) {
                    statuses[arguments[i]] = true;
                }
                for ( var i = 0; i < items.length; i++) {
                    if (statuses[items[i].model.state]) {
                        s++;
                    }
                }
                return s;
            },

            __finishUpload : function() {
                rf.submitForm(this.form, {"org.richfaces.ajax.component": this.id}, this.id);
            }
        };
    })());


    var Item = function(fileUpload, file) {
        this.fileUpload = fileUpload;
        //this.input = fileUpload.input;
        this.model = {name: file.name, state: ITEM_STATE.NEW, file: file};
    };

    $.extend(Item.prototype, {
            getJQuery: function() {
                this.element = $(ITEM_HTML);
                var leftArea = this.element.children(".rf-fu-itm-lft:first");
                this.label = leftArea.children(".rf-fu-itm-lbl:first");
                this.state = this.label.nextAll(".rf-fu-itm-st:first");
                this.link = leftArea.next().children("a");
                this.label.html(this.model.name);
                this.link.html(this.fileUpload["deleteLabel"]);
                this.link.click($.proxy(this.removeOrStop, this));
                return this.element;
            },

            removeOrStop: function() {
                //this.input.remove();
                this.element.remove();
                this.fileUpload.__removeItem(this);
            },

            startUploading: function() {
                this.state.css("display", "block");
                this.link.html("");
                //this.input.attr("name", this.fileUpload.id);
                this.model.state = ITEM_STATE.UPLOADING;
                this.uid = Math.random();

                var xhr = new XMLHttpRequest(),
                    formData = new FormData(this.fileUpload.form[0]);
                    fileName = this.model.file.name;

                formData.append(this.fileUpload.id, this.model.file);

                var originalAction = this.fileUpload.form.attr("action");
                var delimiter = originalAction.indexOf("?") == -1 ? "?" : "&";
                var newAction =  originalAction + delimiter + UID + "=" + this.uid;

                xhr.onprogress = function(e) {
                    console.log('progress');
                    console.log(fileName);
                    console.log(e || 'no event');
                };

                xhr.onload = $.proxy(function (e) {
                    console.log('load');
                    console.log(fileName);
                    console.log(e || 'no event');
                    this.fileUpload.__startUpload();

                    var state = ITEM_STATE.DONE;
                    //this.input.remove();
                    this.state.html(this.fileUpload[state + "Label"]);
                    this.link.html(this.fileUpload["clearLabel"]);
                    this.model.state = state;
                    }, this);

                var render = this.fileUpload.render,
                    execute = this.fileUpload.execute,
                    renderString, executeString;

                if (render != '@none') {
                    if (!render) {
                        renderString = this.fileUpload.id;
                    }
                    else {
                        switch(render) {
                            case '@all':
                                renderString = '@all';
                            case '@form':
                                renderString = this.fileUpload.form[0].id;
                                break;
                            case '@this':
                                renderString = this.fileUpload.id;
                                break;
                            default:
                                renderString = render;
                        }
                    }
                }

                if (execute != '@none') {
                    if (!execute) {
                        executeString = this.fileUpload.id;
                    }
                    else {
                        switch(execute) {
                            case '@all':
                                executeString = '@all';
                            case '@form':
                                executeString = this.fileUpload.form[0].id;
                                break;
                            case '@this':
                                executeString = this.fileUpload.id;
                                break;
                            default:
                                executeString = execute;
                        }
                    }
                }

                formData.append('javax.faces.partial.ajax', 'true');
                formData.append('javax.faces.source', this.fileUpload.id);

                //if (render != '@none') {
                //    formData.append('javax.faces.partial.execute', executeString);
                //}
                //if (execute != '@none') {
                    //formData.append('javax.faces.partial.render', renderString);
                    formData.append('javax.faces.partial.execute', this.fileUpload.id);
                //}

                xhr.open('POST', newAction, true);

                xhr.send(formData);
                //this.fileUpload.__submit();
                // if (this.fileUpload.progressBar) {
                   // this.fileUpload.progressBar.setValue(0);
                   // this.state.html(this.fileUpload.progressBarElement.detach());

                   // var params = {};
                   // params[UID_ALT] = this.uid;
                  //  this.fileUpload.progressBar.enable(params);
                //}

                this.finishUploading();
            },

            finishUploading: function(state) {
                // if (this.fileUpload.progressBar) {
                //     this.fileUpload.progressBar.disable();
                //     this.fileUpload.hiddenContainer.append(this.fileUpload.progressBarElement.detach());
                // }
                //this.input.remove();
                this.state.html(this.fileUpload[state + "Label"]);
                this.link.html(this.fileUpload["clearLabel"]);
                this.model.state = state;
            }
        });
}(RichFaces.jQuery, RichFaces));