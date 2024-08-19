if (typeof window.centovacast === "undefined") {
    window.centovacast = {};
}

if (typeof window.centovacast.options === "undefined") {
    window.centovacast.options = {};
}

if (typeof window.centovacast.loader === "undefined") {
    window.centovacast.loader = {
        attempts: 0,
        external_jquery: false,
        loaded: false,
        ready: false,
        widget_definitions: {},
        url: "",
        load_script: function (url) {
            var script = document.createElement("script");
            if (script !== undefined) {
                script.setAttribute("type", "text/javascript");
                script.setAttribute("src", url);
                if (script !== undefined) {
                    document.getElementsByTagName("head")[0].appendChild(script);
                }
            }
        },
        load_widget: function (widgetName) {
            var widget = this.widget_definitions[widgetName];
            if (widget.ref === null) {
                widget.ref = widget.define(jQuery);
            }
        },
        jq_loaded: function () {
            if (!this.external_jquery) {
                jQuery.noConflict();
            }
            jQuery.getJSONP = this.jq_get_jsonp;
            for (var widgetName in this.widget_definitions) {
                if (typeof widgetName === "string") {
                    this.load_widget(widgetName);
                }
            }
            this.loaded = true;
            var loader = this;
            jQuery(document).ready(function () {
                loader.ready = true;
                for (var widgetName in loader.widget_definitions) {
                    if (typeof loader.widget_definitions[widgetName].init === "function") {
                        loader.widget_definitions[widgetName].init(jQuery);
                    }
                }
            });
        },
        check: function () {
            if (typeof jQuery === "undefined") {
                var loader = this;
                setTimeout(function () {
                    loader.check();
                }, 100);
                this.attempts++;
            } else {
                this.jq_loaded();
            }
        },
        process_widget_element: function (element, data, prefix, hasType) {
            var $element = jQuery(element);
            var isModified = false;
            var widgetData = {};
            var widgetName, value;

            for (widgetName in data) {
                if (data.hasOwnProperty(widgetName)) {
                    var dataAttribute = data[widgetName];
                    value = $element.data(dataAttribute);
                    if (typeof value !== "undefined") {
                        widgetData[dataAttribute] = value;
                        isModified = true;
                    } else {
                        widgetData[dataAttribute] = "";
                    }
                }
            }

            var elementId = $element.prop("id");

            if (isModified) {
                widgetData.type = $element.data("type");
            } else {
                if (typeof elementId !== "string" || elementId.substr(0, prefix.length + 1) !== prefix + "_") {
                    return null;
                }
                widgetData.fromid = true;
                widgetData.originalid = elementId;
                prefix = elementId.substr(prefix.length + 1);
                if (hasType) {
                    var regex = /^([a-z0-9]+)_/;
                    var matches = regex.exec(prefix);
                    if (!matches) return null;
                    widgetData.type = matches[1];
                    prefix = prefix.replace(regex, "");
                }
                var mainDataAttribute = null;
                for (widgetName in data) {
                    if (data.hasOwnProperty(widgetName)) {
                        dataAttribute = data[widgetName];
                        if (mainDataAttribute === null) {
                            mainDataAttribute = dataAttribute;
                        }
                        regex = new RegExp("_" + widgetName + "-([^_]+)");
                        matches = regex.exec(prefix);
                        if (matches) {
                            widgetData[dataAttribute] = matches[1];
                            prefix = prefix.replace(regex, "");
                        }
                    }
                }
                widgetData[mainDataAttribute] = prefix;
                if (typeof widgetData.mount === "string") {
                    widgetData.mount = widgetData.mount.replace(/-/, "/");
                }
            }

            widgetData.id = elementId;
            widgetData.$el = $element;
            return widgetData;
        },
        process_widget_elements: function (elements, data, prefix, hasType) {
            var widgets = {};
            var loader = this;

            elements.each(function () {
                var widget = loader.process_widget_element(this, data, prefix, hasType);
                var key = "" + widget.username + widget.mount;

                if (!widgets[key]) {
                    widgets[key] = jQuery.extend({}, widget);
                    if (hasType) {
                        widgets[key].type = undefined;
                    }
                    widgets[key].hastype = hasType;
                    widgets[key].$el = hasType ? {} : null;
                }
                if (hasType) {
                    widgets[key].$el[widget.type] = widgets[key].$el[widget.type]
                        ? widgets[key].$el[widget.type].add(widget.$el[0])
                        : widget.$el;
                } else {
                    widgets[key].$el = widgets[key].$el ? widgets[key].$el.add(widget.$el[0]) : widget.$el;
                }
            });

            return {
                widget_data: widgets,
                get: function (key) {
                    return this.widget_data[key];
                },
                get_property: function (key, property) {
                    return this.widget_data[key] && this.widget_data[key][property];
                },
                get_element: function (key, type) {
                    return this.widget_data[key] ? 
                        this.widget_data[key].hastype ? 
                        this.widget_data[key].$el[type] ? 
                        this.widget_data[key].$el[type] : jQuery() : 
                        this.widget_data[key].$el ? 
                        this.widget_data[key].$el : jQuery() : 
                        undefined;
                },
                set_element: function (key, type, element) {
                    if (this.widget_data[key].hastype) {
                        if (type && type.length) {
                            this.widget_data[key].$el[type] = element;
                        }
                    } else {
                        this.widget_data[key].$el = element;
                    }
                },
                set_property: function (key, property, value) {
                    if (!this.widget_data[key]) return false;
                    this.widget_data[key][property] = value;
                    return true;
                },
                each: function (callback) {
                    for (var key in this.widget_data) {
                        if (typeof key === "string") {
                            callback(key, this.widget_data[key]);
                        }
                    }
                },
                each_element: function (key, callback) {
                    if (this.widget_data[key].hastype) {
                        for (var type in this.widget_data[key].$el) {
                            if (typeof type === "string" || type !== undefined) {
                                callback(this.widget_data[key].$el[type], type);
                            }
                        }
                    } else {
                        callback(this.widget_data[key].$el);
                    }
                }
            };
        },
        init: function () {
            var scripts = document.getElementsByTagName("script");
            var lastScript = scripts[scripts.length - 1];
            var src = lastScript.getAttribute.length !== undefined ? lastScript.getAttribute("src") : lastScript.getAttribute("src", 2);
            if (!src.match(/^https?:\/\//i)) {
                src = src.replace(/\/system\/.*$/, "/");
            }
            this.url = src.replace(/(\.(?:[a-z]{2,}|[0-9]+)(:[0-9]+)?\/).*$/i, "$1");
            this.external_jquery = typeof jQuery !== "undefined";
            if (!this.external_jquery) {
                this.load_script(this.url + "system/jquery.min.js");
            }
            this.check();
        },
        add: function (widgetName, initCallback, defineCallback) {
            if (!this.widget_definitions[widgetName]) {
                this.widget_definitions[widgetName] = {
                    define: defineCallback,
                    init: initCallback,
                    ref: null
                };
            }
            if (this.loaded) {
                this.load_widget(widgetName);
            }
            if (this.ready) {
                initCallback(jQuery);
            }
        },
        jq_get_jsonp: function (url, data, callback) {
            return jQuery.ajax({
                type: "GET",
                url: url,
                data: data,
                success: callback,
                dataType: "jsonp"
            });
        }
    };

    window.centovacast.loader.init();
}

window.centovacast.loader.add("player", function (jQuery) {
    jQuery.extend(true, window.centovacast.player.settings, window.centovacast.options.player);
    window.centovacast.player.run();
}, function (options) {
    window.centovacast.options.player = jQuery.extend(true, {}, window.centovacast.options.player, window.centovacast.player ? window.centovacast.player.config : null);
    return window.centovacast.player = {
        pollcount: 0,
        settings: { muses: {} },
        widgets: {},
        element_class: ".cc_player",
        inspector: false,
        debug: false,
        dbg: function (msg) {
            if (this.debug) {
                console.log(msg);
            }
        },
        players: {
            muses: function (config, options) {
                var player = window.centovacast.player;
                var musesSettings = player.settings.muses;
                var skin = typeof options.skin === "string" ? options.skin.replace(/[^A-Za-z0-9_-]+/g, "") : "default";
                var playerInstance = {
                    play: function () { },
                    stop: function () { },
                    get: function () {
                        return this.$el[0];
                    },
                    get_container: function () {
                        return this.$el;
                    },
                    destroy: function () {
                        this.stop();
                        this.$el.remove();
                    },
                    embed: function () {
                        this.$el = jQuery("<iframe></iframe>", {
                            class: player.element_class.replace(/^\./, ""),
                            src: musesSettings.url + "?widgetid=" + options.widgetid + "&mount=" + encodeURIComponent(config.mount) + "&autoplay=" + (config.autoplay ? "true" : "false") + "&volume=" + (typeof config.volume === "number" ? config.volume : 75) + "&skin=" + skin
                        });
                        player.jq_el(options).replaceWith(this.$el);
                    },
                    init: function () {
                        this.embed();
                    }
                };
                playerInstance.init();
                return playerInstance;
            }
        },
        jq_el: function (options) {
            return jQuery("#" + options.widgetid + " > " + this.element_class);
        },
        get_el: function (options) {
            return this.jq_el(options)[0];
        },
        run: function () {
            var player = this;
            var elements = jQuery(player.element_class).filter(":empty");
            if (elements.length === 0) return;
            var widgetElements = window.centovacast.loader.process_widget_elements(elements, {
                username: "username",
                mount: "mount",
                skin: "skin",
                volume: "volume",
                autoplay: "autoplay"
            }, "cc_player", false);
            widgetElements.each(function (key, config) {
                var options = jQuery.extend(true, {}, player.settings, widgetElements.get_property(key, "options"));
                widgetElements.set_property(key, "options", options);
                player.widgets[key] = player.players.muses(config, options);
            });
        }
    };
});
