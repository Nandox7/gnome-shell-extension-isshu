const GObject = imports.gi.GObject;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Convenience = Me.imports.convenience;
const Settings = Convenience.getSettings();

const SSHConfiguration = Me.imports.ssh_config.SSHConfiguration;

var SSHPrefsWidget = class SSHPrefsWidget {

    constructor() {

        this.vbox = new Gtk.Box({
			orientation: Gtk.Orientation.VERTICAL,
            spacing: 6,
            margin: 12
        });

        var main_grid = new Gtk.Grid({ orientation: Gtk.Orientation.VERTICAL,
            row_spacing: 4,
            column_spacing: 4
        });

        /* NMap network field */
		var nmap_network_label = new Gtk.Label({
			label: 'Network to scan with NMap',
			halign: Gtk.Align.START
		});
		this.nmap_network_field = new Gtk.Entry({
			hexpand: true,
            halign: Gtk.Align.FILL,
            text: Settings.get_string('nmap-network')
        });
		main_grid.attach(nmap_network_label, 0, 0, 1, 1);
        main_grid.attach(this.nmap_network_field, 1, 0, 3, 1);

        /* Terminal client field */
		var terminal_client_label = new Gtk.Label({
			label: 'Terminal to use',
			halign: Gtk.Align.START
		});
		this.terminal_client_field = new Gtk.Entry({
			hexpand: true,
            halign: Gtk.Align.FILL,
            text: Settings.get_string('terminal-client')
        });
		main_grid.attach(terminal_client_label, 0, 1, 1, 1);
        main_grid.attach(this.terminal_client_field, 1, 1, 3, 1);
        
        /* SSH key location */
		var ssh_key_location_label = new Gtk.Label({
			label: 'SSH private key location',
			halign: Gtk.Align.START
		});
		this.ssh_key_location_field = new Gtk.Entry({
			hexpand: true,
            halign: Gtk.Align.FILL,
            text: Settings.get_string('ssh-key-path')
        });
        var ssh_config = new SSHConfiguration();
        if (Settings.get_string('ssh-key-path') === '') {
            this.ssh_key_location_field.set_text(ssh_config.get_private_key_default_location());
        }
		main_grid.attach(ssh_key_location_label, 0, 2, 1, 1);
        main_grid.attach(this.ssh_key_location_field, 1, 2, 3, 1);

        /* SSH known_hosts file location */
        var known_hosts_file_location_label = new Gtk.Label({
			label: 'SSH known_hosts file location',
			halign: Gtk.Align.START
		});
		this.known_hosts_file_location_field = new Gtk.Entry({
			hexpand: true,
            halign: Gtk.Align.FILL,
            text: Settings.get_string('ssh-known-hosts-path')
        });
        if (Settings.get_string('ssh-known-hosts-path') === '') {
            this.known_hosts_file_location_field.set_text(ssh_config.get_known_hosts_file_default_location());
        }
		main_grid.attach(known_hosts_file_location_label, 0, 3, 1, 1);
        main_grid.attach(this.known_hosts_file_location_field, 1, 3, 3, 1);

        /* Enable inline options */
        var enable_inline_options_label = new Gtk.Label({
			label: 'Enable inline options',
			halign: Gtk.Align.START
		});
		this.enable_inline_options_switch = new Gtk.Switch({
			hexpand: true,
            halign: Gtk.Align.END,
            active: Settings.get_boolean('enable-inline-options')
        });
		main_grid.attach(enable_inline_options_label, 0, 4, 3, 1);
        main_grid.attach(this.enable_inline_options_switch, 1, 4, 1, 1);

        
        this.vbox.add(main_grid);
        
        return;
    }

    _completePrefsWidget() {
        var scrollingWindow = new Gtk.ScrolledWindow({
                                 'hscrollbar-policy': Gtk.PolicyType.AUTOMATIC,
                                 'vscrollbar-policy': Gtk.PolicyType.AUTOMATIC,
                                 'hexpand': true, 'vexpand': true});
        scrollingWindow.add_with_viewport(this.vbox);
        scrollingWindow.width_request = 400;
        scrollingWindow.show_all();
        scrollingWindow.unparent();
        scrollingWindow.connect('destroy', Lang.bind(this, function() {
            if (this.nmap_network_field.get_text() != Settings.get_string('nmap-network')) {
                Settings.set_string('nmap-network', this.nmap_network_field.get_text());
            }
            if (this.terminal_client_field.get_text() != Settings.get_string('terminal-client')) {
                Settings.set_string('terminal-client', this.terminal_client_field.get_text());
            }
            if (this.ssh_key_location_field.get_text() != Settings.get_string('ssh-key-path')) {
                Settings.set_string('ssh-key-path', this.ssh_key_location_field.get_text());
            }
            if (this.known_hosts_file_location_field.get_text() != Settings.get_string('ssh-known-hosts-path')) {
                Settings.set_string('ssh-known-hosts-path', this.known_hosts_file_location_field.get_text());
            }
            if (this.enable_inline_options_switch.active != Settings.get_boolean('enable-inline-options')) {
                Settings.set_boolean('enable-inline-options', this.enable_inline_options_switch.active);
            }

        }));

        return scrollingWindow;
    }
};

function init() {
}

function buildPrefsWidget() {
    var widget = new SSHPrefsWidget();
	return widget._completePrefsWidget();
}