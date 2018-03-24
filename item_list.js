const Lang = imports.lang;
const St = imports.gi.St;
const Gtk = imports.gi.Gtk;
const Clutter = imports.gi.Clutter;

const ItemList = new Lang.Class({
    Name: 'ItemList',
    Extends: St.BoxLayout,

    _init: function() {
        this.parent({
            vertical: true
        });

        this._scrollView = new St.ScrollView({
            style_class: 'nm-dialog-scroll-view listbox-top-margin'
        });
        this._scrollView.set_x_expand(true);
        this._scrollView.set_y_expand(true);
        this._scrollView.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
        this._scrollView.add_actor(this);
    },

    // item must be a St.Widget
    add_item: function(item) {

        item.add_style_class_name('nm-dialog-item');
        item.set_can_focus(true);
        item.set_reactive(true);

        let action = new Clutter.ClickAction();
        action.connect('clicked', Lang.bind(this, function () {
            if (this.selected_item) {
                this.selected_item.remove_style_pseudo_class('selected');
            }
            item.grab_key_focus(); // needed for setting the correct focus
            this.selected_item = item;
            item.add_style_pseudo_class('selected');
        }));
        item.add_action(action);
        item.connect('key-focus-in', Lang.bind(this, function() {
        }));

        this.add_child(item);
    },

    get_scroll_view: function() {
        return this._scrollView;
    },

    get_selected_item: function() {
        return this.selected_item;
    }
});