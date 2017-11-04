const Lang = imports.lang;
const Util = imports.misc.util;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter; 
const Gtk = imports.gi.Gtk;
const Gio = imports.gi.Gio;
const Main = imports.ui.main;
const GLib = imports.gi.GLib; 
const Animation = imports.ui.animation;
const Tweener = imports.ui.tweener;
const Signals = imports.signals;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Settings = Convenience.getSettings();
const CustomSignals = Me.imports.custom_signals.CustomSignals;
const NMapParser = Me.imports.nmap_parser.NMapParser;

const NmapPanel = new Lang.Class({
    Name: 'NmapPanel',
    Extends: St.Widget,

	_init: function() {
        this.parent({
            layout_manager: new Clutter.BinLayout(),
            style_class: 'nmap-panel'
        });

        this.custom_signals = new CustomSignals();
        this.all_items = [];

        let header_box = new St.BoxLayout({
            vertical: false
        });

        let nmap_title = new St.Label({
            style_class: 'nm-dialog-header',
            y_align: St.Align.END,
            text: 'Nmap results'
        });
        
        // close button
        let close_icon = new St.Icon({
            style_class: 'nm-dialog-icon'
        });
        close_icon.set_icon_name('window-close-symbolic');
        
        let nmap_close_button = new St.Button({
            style_class: 'button header-button'
        });
        nmap_close_button.set_child(close_icon);

        // refresh button
        let refresh_icon = new St.Icon({
            style_class: 'nm-dialog-icon'
        });
        refresh_icon.set_icon_name('view-refresh-symbolic');
        let nmap_refresh_button = new St.Button({
            style_class: 'button header-button'
        });
        nmap_refresh_button.set_child(refresh_icon);

        let nmap_ports_button = new St.Button({
            style_class: 'button header-button',
            label: 'Scan ports'
        });

        nmap_ports_button.connect('clicked', Lang.bind(this, function() {
            for(let i in this.all_items) {
                let item = this.all_items[i];
                global.log('scanning ports of ' + item.get_host());
                let cmd = ['nmap', '-sT', '-oG', '-', item.get_host()];
                let subprocess = new Gio.Subprocess({
                    argv: cmd,
                    flags: Gio.SubprocessFlags.STDOUT_PIPE,
                });
                subprocess.init(null);
                subprocess.communicate_async(null, null, Lang.bind(this, function(obj, res) {
                    let [, out] = obj.communicate_utf8_finish(res);
                    let parser = new NMapParser();
                    let ports = parser.find_ports(out);
                    item.display_ports(ports);
                }));
            }
        }));

        nmap_refresh_button.connect('clicked', Lang.bind(this, function () {
            this.custom_signals.emit('refresh-nmap');
        }));

        nmap_close_button.connect('clicked', Lang.bind(this, function () {
            this.custom_signals.emit('close-nmap');
        }));
        
        header_box.add(nmap_title, {
            expand: true
        });
        header_box.add(nmap_ports_button, {
            x_align: St.Align.END
        });
        header_box.add(nmap_refresh_button, {
            x_align: St.Align.END
        });
        header_box.add(nmap_close_button, {
            x_align: St.Align.END
        });

        this._itemBox = new St.BoxLayout({
            vertical: true
        });
        this._scrollView = new St.ScrollView({
            style_class: 'nm-dialog-scroll-view'
        });
        this._scrollView.set_x_expand(true);
        this._scrollView.set_y_expand(true);
        this._scrollView.set_policy(Gtk.PolicyType.NEVER,
            Gtk.PolicyType.AUTOMATIC);
        this._scrollView.add_actor(this._itemBox);

        let container = new St.BoxLayout({
            vertical: true,
            x_expand: true
        });
        container.add(header_box, {
            x_expand: true
        });
        container.add(this._scrollView);

        this.add_child(container);

        // add items
        let item;
        if (Settings.get_string('nmap-network') === '') {
            item = new ListItem('Enter a netword to scan in the Preferences menu.');
        } else if (this.is_nmap_installed()) {
            item = new LoadingItem();
            this.populate_nmap_list();
        } else {
            item = new NmapErrorItem();
        }
        this._itemBox.add_child(item.actor);
    },

    is_nmap_installed: function() {
        let [res, out, err, status] = GLib.spawn_command_line_sync('which --skip-alias nmap');
        // it seems that if the command exists, the status value is 0, and 256 otherwise
        return status == 0;
    },

    populate_nmap_list: function() {

        let cmd = ['nmap', '-sn',
              '-oG', '-',
              Settings.get_string('nmap-network')];
        // TODO Cannot manage to parse the result XML, so use the option -oG instead of -oX
    
        let subprocess = new Gio.Subprocess({
            argv: cmd,
            flags: Gio.SubprocessFlags.STDOUT_PIPE,
        });
        subprocess.init(null);
        subprocess.communicate_async(null, null, Lang.bind(this, function(obj, res) {
            let [, out] = obj.communicate_utf8_finish(res);
            this.add_nmap_items(out);
            // Mainloop.quit('main');
        }));
        // Mainloop.run('main');

        // let cmd = 'nmap -sn -oG - ' + Settings.get_string('nmap-network');
        // return this.async(function() {
        //         let [res, out, err, status] = GLib.spawn_command_line_sync(cmd);
        //         return {
        //         cmd: cmd,
        //         res: res,
        //         out: out,
        //         err: err,
        //         status: status
        //         };
        // }, Lang.bind(this, this.add_nmap_items));

    },

    // async: function(fn, callback) {
    //     GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, function() {
    //         let result = fn();
    //         callback(result);
    //     }, null);
    // },

    add_nmap_items : function(res) {
        if (res !== null && res !== undefined) {
            let nmaps =  res;
            let raw = nmaps.split('Host:');
            let hosts = [];
            for (let h in raw) {
                let tmp = raw[h];
                if (tmp.indexOf('# Nmap') != 0) {
                    let index = tmp.indexOf('()');
                    let host = tmp.slice(0, index).trim();
                    hosts.push(host);
                }
            }

            // remove the loading item before adding the results
            this._itemBox.remove_all_children();
            
            for (let h in hosts) {
                let item = new NmapItem(hosts[h]);
                this.all_items.push(item);
                this._itemBox.add_child(item.actor);
                item.connect('item-selected', Lang.bind(this, function(){
                    if (this.selected_item) {
                        this.selected_item.actor.remove_style_pseudo_class('selected');
                        this.selected_item.hide_load_nmap_button();
                    }
                    this.selected_item = item;
                    this.selected_item.actor.add_style_pseudo_class('selected');
                    this.selected_item.show_load_nmap_button();
                    Util.ensureActorVisibleInScrollView(this._scrollView, this.selected_item.actor);
                }));
                item.connect('load-nmap', Lang.bind(this, function(){
                    this.custom_signals.emit('load-nmap');
                }));
            }
        } else {
            let errMsg = "Error occurred when running 'nmap'";
            Main.notify(errMsg);
            log(errMsg);
        }
    },

    get_all_items: function() {
        return this.all_items;
    },

    get_selected_item: function() {
        return this.selected_item;
    },
});

const ListItem = new Lang.Class({
    Name: 'ListItem',

    _init: function (text) {

        this.actor = new St.BoxLayout({
            style_class: 'nm-dialog-item'
            ,can_focus: true
            ,reactive: true
        });

        let label = new St.Label({
            text: text
        });

        this.actor.add(label, {
            expand: true,
            x_align: St.Align.START
        });
    }
});

const NmapItem = new Lang.Class({
    Name: 'NmapItem',
    Extends: ListItem,

    _init: function (host) {
        this.parent(host);

        this.host = host;

        let action = new Clutter.ClickAction();
        action.connect('clicked', Lang.bind(this, function () {
            this.actor.grab_key_focus(); // needed for setting the correct focus
        }));
        this.actor.add_action(action);
        this.actor.connect('key-focus-in', Lang.bind(this, function() {
            this.emit('item-selected');
        }));

        let ports_box = new St.BoxLayout({
            vertical: true
        });
        this.ssh_port = new St.Label({});
        this.telnet_port = new St.Label({});
        ports_box.add(this.ssh_port);
        ports_box.add(this.telnet_port);
        this.actor.add(ports_box, {
            x_align: St.Align.END
        });

         // LOAD NMAP BUTTON
        let load_nmap_icon = new St.Icon({
            style_class: 'nm-dialog-icon'
        });
        load_nmap_icon.set_icon_name('document-edit-symbolic');
        this.load_nmap_button = new St.Button({
            style_class: 'button item-button',
            visible: false
        });
        this.load_nmap_button.set_child(load_nmap_icon);
        this.load_nmap_button.connect('clicked', Lang.bind(this, function() {
            this.emit('load-nmap');
        }));
        this.actor.add(this.load_nmap_button, {
            x_align: St.Align.END
        });
    },

    show_load_nmap_button: function() {
        this.load_nmap_button.visible = true;
    },

    hide_load_nmap_button: function() {
        this.load_nmap_button.visible = false;
    },

    get_host: function() {
        return this.host;
    },

    display_ports: function(ports) {
        for (let p in ports) {
            let port = ports[p];
            if (port.protocol === 'ssh') {
                // this.set_ssh_item();
                // this.ssh_port = port.port;
                this.ssh_port.set_text('SSH port ' + port.value);
                global.log(this.host + ' has SSH port ' + port.value);
            }
            if (port.protocol === 'telnet') {
                // this.set_telnet_item();
                // this.telnet_port = port.port;
                this.telnet_port.set_text('Telnet port ' + port.value);
                global.log(this.host + ' has TELNET port ' + port.value);
            }
        }
        // TODO display the port. 
        // TODO Find a way to show 2 choices if there is both SSH and telnet
        // this.set_label_text(this.get_label_text() + ':' + ports[0].port);
    }

});
Signals.addSignalMethods(NmapItem.prototype);

const NmapErrorItem = new Lang.Class({
    Name: 'NmapErrorItem',
    Extends: ListItem,

    _init: function() {
        this.parent('NMap is not installed on your computer. Install it to benefit of this feature.');
    }
});

const LoadingItem = new Lang.Class({
    Name: 'LoadingItem',
    Extends: ListItem,

    _init: function() {
        this.parent('Loading...');
        let spinnerIcon = Gio.File.new_for_uri('resource:///org/gnome/shell/theme/process-working.svg');
        let spinner = new Animation.AnimatedIcon(spinnerIcon, 16);
        spinner.actor.show();
        this.actor.add_child(spinner.actor);
        spinner.play();
		Tweener.addTween(spinner.actor, {
			opacity: 255,
			transition: 'linear'
        });
    }
});