const ModalDialog = imports.ui.modalDialog;
const CheckBox = imports.ui.checkBox.CheckBox;
const Lang = imports.lang;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter; 
const Util = imports.misc.util;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const FavouriteConnectionsBox = Me.imports.favourite_connections_box.FavouriteConnectionsBox;
const SavedConfiguration = Me.imports.saved_configuration.SavedConfiguration;
const NmapPanel = Me.imports.nmap_menu.NmapPanel;

const NewConnectionDialog = new Lang.Class({
    Name: 'NewConnectionDialog',
    Extends: ModalDialog.ModalDialog,

    _init: function () {
        this.parent({
            styleClass: 'nm-dialog'
        });
        this.savedConfig = new SavedConfiguration();
        this._buildLayout();
    },

    _buildLayout: function () {
        let headline = new St.BoxLayout({
            style_class: 'nm-dialog-header-hbox'
        });

        let icon = new St.Icon({
            style_class: 'nm-dialog-header-icon'
        });

        let titleBox = new St.BoxLayout({
            vertical: true
        });
        let title = new St.Label({
            style_class: 'nm-dialog-header',
            text: _("New connection")
        });
        titleBox.add(title);

        headline.add(icon);
        headline.add(titleBox);

        this.contentLayout.add(headline);

        

        // ADDRESS BOX
        let address_box = new St.BoxLayout({
            vertical: true
        });

        let label = new St.Label({
            text: 'Address'
		});
        address_box.add(label);

        this.address_field = new St.Entry({
            style_class: 'run-dialog-entry'
        });
        address_box.add(this.address_field);
        this.setInitialKeyFocus(this.address_field);

        // PORT BOX
        let port_box = new St.BoxLayout({
            vertical: true,
            width: '100'
        });

        let port_label = new St.Label({
            text: 'Port'
		});
        port_box.add(port_label);

        this.port_field = new St.Entry({
            hint_text: '22 (default)',
            style_class: 'run-dialog-entry'
        });
        port_box.add(this.port_field);

        // HOST BOX
        let host_box = new St.BoxLayout({
            vertical: false
        });
        host_box.add(address_box, {
            expand: true
        });
        host_box.add(port_box, {
            x_align: St.Align.END
        });

        this.contentLayout.add(host_box, {
            y_align: St.Align.START
        });

        let user_label = new St.Label({
            text: 'User'
		});
        this.contentLayout.add(user_label, {
			y_align: St.Align.START
        });

        this.user_field = new St.Entry({
            style_class: 'run-dialog-entry'
        });
        
        this.contentLayout.add(this.user_field, {
            y_align: St.Align.START
        });

        // FAVOURITE BOX

        let favBox_header = new St.Label({
            style_class: 'nm-dialog-header',
            text: 'Favourite connections'
        });
        this.favConnectionsBox = new FavouriteConnectionsBox();
        this.favConnectionsBox.connect('load-favourite', Lang.bind(this, this.load_favourite_connection));
        this.favConnectionsBox.connect('save-favourite', Lang.bind(this, this.add_favourite));
        this.contentLayout.add(favBox_header, {
            expand: false
        });
        this.contentLayout.add(this.favConnectionsBox, {
            expand: true
        });

        this._connectButton = this.addButton({
            action: Lang.bind(this, this.connect),
            label: "Connect",
            key: Clutter.Return
        });
        this._nmapButton = this.addButton({
            action: Lang.bind(this, this.showNmap),
            label: "NMap"
        });
        this._cancelButton = this.addButton({
            action: Lang.bind(this, this.close),
            label: _("Cancel"),
            key: Clutter.Escape
        }, {
            expand: true,
            x_fill: false,
            x_align: St.Align.END
        });

    },

    add_favourite: function() {
        let connection = new Array();
        let label = this.favConnectionsBox.get_favourite_label_entry();
        if (label === '') {
            label = 'no-name';
        }
        connection.label = label;
        connection.address = this.address_field.get_text();
        connection.port = this.port_field.get_text();
        connection.username = this.user_field.get_text();
        this.savedConfig.save_connection_as_a_favourite(connection);

        this.favConnectionsBox.refresh();
    },

    connect: function() {
        var username = this.user_field.get_text();
        var address = this.address_field.get_text();
        var port = 22;
        if (this.port_field.get_text() != '') {
            port = this.port_field.get_text();
        }

        var ssh_command = 'ssh ' + username + '@' + address + ' -p ' + port;
        global.log(ssh_command);

        var connection = this.savedConfig.get_connection_from_details(address, port, username);
        this.savedConfig.save_connection_as_a_latest(connection);

        // can also use 'xterm'
        // TODO need to be able to choose the terminal
        Util.spawn(['gnome-terminal', '-e', ssh_command]);

        this.nmap_displayed = true;
        this.close();
    },

    showNmap: function() {
        if (!this.is_nmap_displayed()) {
            let header_box = new St.BoxLayout({
                vertical: false
            });

            let nmap_title = new St.Label({
                style_class: 'nm-dialog-header',
                text: 'Nmap results'
            });
            
            // close button
            let close_icon = new St.Icon({
                style_class: 'nm-dialog-icon'
            });
            close_icon.set_icon_name('window-close-symbolic');
            
            let nmap_close_button = new St.Button({
            });
            nmap_close_button.set_child(close_icon);

            // refresh button
            let refresh_icon = new St.Icon({
                style_class: 'nm-dialog-icon'
            });
            refresh_icon.set_icon_name('view-refresh-symbolic');
            let nmap_refresh_button = new St.Button({
            });
            nmap_refresh_button.set_child(refresh_icon);
            
            header_box.add(nmap_title, {
                expand: true
            })
            header_box.add(nmap_refresh_button, {
                x_align: St.Align.END
            });
            header_box.add(nmap_close_button, {
                x_align: St.Align.END
            });
            this.contentLayout.add(header_box, {
                x_expand: true
            });

            nmap_refresh_button.connect('clicked', Lang.bind(this, function () {
                this.contentLayout.remove_child(this.nmap_panel);
                this.build_and_add_nmap_panel();
            }));

            nmap_close_button.connect('clicked', Lang.bind(this, function () {
                this.contentLayout.remove_child(header_box);
                this.contentLayout.remove_child(this.nmap_panel);
                this.nmap_displayed = false;
            }));
            
            this.build_and_add_nmap_panel();
        }
    },

    is_nmap_displayed: function() {
        return this.nmap_displayed;
    },

    load_favourite_connection: function() {
        let connection = this.favConnectionsBox.get_selected_item().get_connection();
        this.address_field.set_text(connection.address);
        this.port_field.set_text(connection.port);
        this.user_field.set_text(connection.username);
    },

    build_and_add_nmap_panel: function() {
        this.nmap_panel = new NmapPanel();
        this.contentLayout.add(this.nmap_panel, {
            expand: false
        });
        this.nmap_panel.connect('load-nmap', Lang.bind(this, function() {
            let address = this.nmap_panel.get_selected_item().get_host();
            this.address_field.set_text(address);
            this.port_field.set_text('');
            this.user_field.set_text('');
        }));
        this.nmap_displayed = true;
    }

});