// -*- mode: js; js-indent-level: 4; indent-tabs-mode: nil -*-

const Clutter = imports.gi.Clutter;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Mainloop = imports.mainloop;
const Meta = imports.gi.Meta;
const Signals = imports.signals;
const Lang = imports.lang;
const Shell = imports.gi.Shell;
const St = imports.gi.St;

const AppDisplay = imports.ui.appDisplay;
const Main = imports.ui.main;
const OverviewControls = imports.ui.overviewControls;
const Params = imports.misc.params;
const RemoteSearch = imports.ui.remoteSearch;
const Search = imports.ui.search;
const SearchDisplay = imports.ui.searchDisplay;
const ShellEntry = imports.ui.shellEntry;
const Tweener = imports.ui.tweener;
const Wanda = imports.ui.wanda;
const WorkspacesView = imports.ui.workspacesView;

const SHELL_KEYBINDINGS_SCHEMA = 'org.gnome.shell.keybindings';

const ViewPage = {
    WINDOWS: 1,
    APPS: 2,
    SEARCH: 3
};

const FocusTrap = new Lang.Class({
    Name: 'FocusTrap',
    Extends: St.Widget,

    vfunc_navigate_focus: function(from, direction) {
        if (direction == Gtk.DirectionType.TAB_FORWARD ||
            direction == Gtk.DirectionType.TAB_BACKWARD)
            return this.parent(from, direction);
        return false;
    }
});

function getTermsForSearchString(searchString) {
    searchString = searchString.replace(/^\s+/g, '').replace(/\s+$/g, '');
    if (searchString == '')
        return [];

    let terms = searchString.split(/\s+/);
    return terms;
}

const ViewSelector = new Lang.Class({
    Name: 'ViewSelector',

    _init : function(searchEntry, showAppsButton) {
        this.actor = new Shell.Stack({ name: 'viewSelector' });

        this._showAppsBlocked = false;
        this._showAppsButton = showAppsButton;
        this._showAppsButton.connect('notify::checked', Lang.bind(this, this._onShowAppsButtonToggled));

        this._activePage = null;

        this._searchActive = false;
        this._searchTimeoutId = 0;

        this._searchSystem = new Search.SearchSystem();

        this._entry = searchEntry;
        ShellEntry.addContextMenu(this._entry);

        this._text = this._entry.clutter_text;
        this._text.connect('text-changed', Lang.bind(this, this._onTextChanged));
        this._text.connect('key-press-event', Lang.bind(this, this._onKeyPress));
        this._text.connect('key-focus-in', Lang.bind(this, function() {
            this._searchResults.highlightDefault(true);
        }));
        this._text.connect('key-focus-out', Lang.bind(this, function() {
            this._searchResults.highlightDefault(false);
        }));
        this._entry.connect('notify::mapped', Lang.bind(this, this._onMapped));
        global.stage.connect('notify::key-focus', Lang.bind(this, this._onStageKeyFocusChanged));

        this._entry.set_primary_icon(new St.Icon({ style_class: 'search-entry-icon',
                                                   icon_name: 'edit-find-symbolic' }));
        this._clearIcon = new St.Icon({ style_class: 'search-entry-icon',
                                        icon_name: 'edit-clear-symbolic' });

        this._iconClickedId = 0;
        this._capturedEventId = 0;

        this._workspacesDisplay = new WorkspacesView.WorkspacesDisplay();
        this._workspacesPage = this._addPage(this._workspacesDisplay.actor,
                                             _("Windows"), 'emblem-documents-symbolic');

        this._appDisplay = new AppDisplay.AppDisplay();
        this._appsPage = this._addPage(this._appDisplay.actor,
                                       _("Applications"), 'view-grid-symbolic');

        this._searchResults = new SearchDisplay.SearchResults(this._searchSystem);
        this._searchPage = this._addPage(this._searchResults.actor,
                                         _("Search"), 'edit-find-symbolic',
                                         { a11yFocus: this._entry });

        this._searchSettings = new Gio.Settings({ schema: Search.SEARCH_PROVIDERS_SCHEMA });
        this._searchSettings.connect('changed::disabled', Lang.bind(this, this._reloadRemoteProviders));
        this._searchSettings.connect('changed::disable-external', Lang.bind(this, this._reloadRemoteProviders));
        this._searchSettings.connect('changed::sort-order', Lang.bind(this, this._reloadRemoteProviders));

        // Default search providers
        // Wanda comes obviously first
        this.addSearchProvider(new Wanda.WandaSearchProvider());
        this.addSearchProvider(new AppDisplay.AppSearchProvider());

        // Load remote search providers provided by applications
        RemoteSearch.loadRemoteSearchProviders(Lang.bind(this, this.addSearchProvider));

        // Since the entry isn't inside the results container we install this
        // dummy widget as the last results container child so that we can
        // include the entry in the keynav tab path
        this._focusTrap = new FocusTrap({ can_focus: true });
        this._focusTrap.connect('key-focus-in', Lang.bind(this, function() {
            this._entry.grab_key_focus();
        }));
        this._searchResults.actor.add_actor(this._focusTrap);

        global.focus_manager.add_group(this._searchResults.actor);

        this._stageKeyPressId = 0;
        Main.overview.connect('showing', Lang.bind(this,
            function () {
                this._resetShowAppsButton();
                this._stageKeyPressId = global.stage.connect('key-press-event',
                                                             Lang.bind(this, this._onStageKeyPress));
            }));
        Main.overview.connect('hiding', Lang.bind(this,
            function () {
                this._resetShowAppsButton();
                if (this._stageKeyPressId != 0) {
                    global.stage.disconnect(this._stageKeyPressId);
                    this._stageKeyPressId = 0;
                }
            }));

        Main.wm.addKeybinding('toggle-application-view',
                              new Gio.Settings({ schema: SHELL_KEYBINDINGS_SCHEMA }),
                              Meta.KeyBindingFlags.NONE,
                              Shell.KeyBindingMode.NORMAL |
                              Shell.KeyBindingMode.OVERVIEW,
                              Lang.bind(this, this._toggleAppsPage));
    },

    _toggleAppsPage: function() {
        Main.overview.show();
        this._showAppsButton.checked = !this._showAppsButton.checked;
    },

    show: function() {
        this._activePage = this._workspacesPage;

        this.reset();
        this._appsPage.hide();
        this._searchPage.hide();
        this._workspacesDisplay.show();

        if (!this._workspacesDisplay.activeWorkspaceHasMaximizedWindows())
            Main.overview.fadeOutDesktop();

        this._showPage(this._workspacesPage, true);
    },

    zoomFromOverview: function() {
        this._workspacesDisplay.zoomFromOverview();

        if (!this._workspacesDisplay.activeWorkspaceHasMaximizedWindows())
            Main.overview.fadeInDesktop();
    },

    hide: function() {
        this._workspacesDisplay.hide();
    },

    _addPage: function(actor, name, a11yIcon, params) {
        params = Params.parse(params, { a11yFocus: null });

        let page = new St.Bin({ child: actor,
                                x_align: St.Align.START,
                                y_align: St.Align.START,
                                x_fill: true,
                                y_fill: true });
        if (params.a11yFocus)
            Main.ctrlAltTabManager.addGroup(params.a11yFocus, name, a11yIcon);
        else
            Main.ctrlAltTabManager.addGroup(actor, name, a11yIcon,
                                            { proxy: this.actor,
                                              focusCallback: Lang.bind(this,
                                                  function() {
                                                      this._a11yFocusPage(page);
                                                  })
                                            });;
        this.actor.add_actor(page);
        return page;
    },

    _fadePageIn: function(oldPage) {
        if (oldPage)
            oldPage.hide();

        this.emit('page-empty');

        this._activePage.show();
        Tweener.addTween(this._activePage,
            { opacity: 255,
              time: OverviewControls.SIDE_CONTROLS_ANIMATION_TIME,
              transition: 'easeOutQuad'
            });
    },

    _showPage: function(page, noFade) {
        if (page == this._activePage)
            return;

        let oldPage = this._activePage;
        this._activePage = page;
        this.emit('page-changed');

        if (oldPage && !noFade)
            Tweener.addTween(oldPage,
                             { opacity: 0,
                               time: OverviewControls.SIDE_CONTROLS_ANIMATION_TIME,
                               transition: 'easeOutQuad',
                               onComplete: Lang.bind(this,
                                   function() {
                                       this._fadePageIn(oldPage);
                                   })
                             });
        else
            this._fadePageIn(oldPage);
    },

    _a11yFocusPage: function(page) {
        this._showAppsButton.checked = page == this._appsPage;
        page.navigate_focus(null, Gtk.DirectionType.TAB_FORWARD, false);
    },

    _onShowAppsButtonToggled: function() {
        if (this._showAppsBlocked)
            return;

        this._showPage(this._showAppsButton.checked ?
                       this._appsPage : this._workspacesPage);
    },

    _resetShowAppsButton: function() {
        this._showAppsBlocked = true;
        this._showAppsButton.checked = false;
        this._showAppsBlocked = false;

        this._showPage(this._workspacesPage, true);
    },

    _onStageKeyPress: function(actor, event) {
        // Ignore events while anything but the overview has
        // pushed a modal (system modals, looking glass, ...)
        if (Main.modalCount > 1)
            return false;

        let modifiers = event.get_state();
        let symbol = event.get_key_symbol();

        if (symbol == Clutter.Escape) {
            if (this._searchActive)
                this.reset();
            else if (this._showAppsButton.checked)
                this._showAppsButton.checked = false;
            else
                Main.overview.hide();
            return true;
        } else if (this._shouldTriggerSearch(symbol)) {
            this.startSearch(event);
        } else if (!this._searchActive) {
            if (symbol == Clutter.Tab || symbol == Clutter.Down) {
                this._activePage.navigate_focus(null, Gtk.DirectionType.TAB_FORWARD, false);
                return true;
            } else if (symbol == Clutter.ISO_Left_Tab) {
                this._activePage.navigate_focus(null, Gtk.DirectionType.TAB_BACKWARD, false);
                return true;
            }
        }
        return false;
    },

    _searchCancelled: function() {
        this._showPage(this._showAppsButton.checked ? this._appsPage
                                                    : this._workspacesPage);

        // Leave the entry focused when it doesn't have any text;
        // when replacing a selected search term, Clutter emits
        // two 'text-changed' signals, one for deleting the previous
        // text and one for the new one - the second one is handled
        // incorrectly when we remove focus
        // (https://bugzilla.gnome.org/show_bug.cgi?id=636341) */
        if (this._text.text != '')
            this.reset();
    },

    reset: function () {
        global.stage.set_key_focus(null);

        this._entry.text = '';

        this._text.set_cursor_visible(true);
        this._text.set_selection(0, 0);
    },

    _onStageKeyFocusChanged: function() {
        let focus = global.stage.get_key_focus();
        let appearFocused = (this._entry.contains(focus) ||
                             this._searchResults.actor.contains(focus));

        this._text.set_cursor_visible(appearFocused);

        if (appearFocused)
            this._entry.add_style_pseudo_class('focus');
        else
            this._entry.remove_style_pseudo_class('focus');
    },

    _onMapped: function() {
        if (this._entry.mapped) {
            // Enable 'find-as-you-type'
            this._capturedEventId = global.stage.connect('captured-event',
                                 Lang.bind(this, this._onCapturedEvent));
            this._text.set_cursor_visible(true);
            this._text.set_selection(0, 0);
        } else {
            // Disable 'find-as-you-type'
            if (this._capturedEventId > 0)
                global.stage.disconnect(this._capturedEventId);
            this._capturedEventId = 0;
        }
    },

    _shouldTriggerSearch: function(symbol) {
        let unicode = Clutter.keysym_to_unicode(symbol);
        if (unicode == 0)
            return false;

        if (getTermsForSearchString(String.fromCharCode(unicode)).length > 0)
            return true;

        return symbol == Clutter.BackSpace && this._searchActive;
    },

    startSearch: function(event) {
        global.stage.set_key_focus(this._text);
        this._text.event(event, true);
    },

    // the entry does not show the hint
    _isActivated: function() {
        return this._text.text == this._entry.get_text();
    },

    _onTextChanged: function (se, prop) {
        let terms = getTermsForSearchString(this._entry.get_text());

        let searchPreviouslyActive = this._searchActive;
        this._searchActive = (terms.length > 0);

        let startSearch = this._searchActive && !searchPreviouslyActive;
        if (startSearch)
            this._searchResults.startingSearch();

        if (this._searchActive) {
            this._entry.set_secondary_icon(this._clearIcon);

            if (this._iconClickedId == 0)
                this._iconClickedId = this._entry.connect('secondary-icon-clicked',
                    Lang.bind(this, this.reset));

            if (this._searchTimeoutId == 0)
                this._searchTimeoutId = Mainloop.timeout_add(150,
                    Lang.bind(this, this._doSearch));
        } else {
            if (this._iconClickedId > 0) {
                this._entry.disconnect(this._iconClickedId);
                this._iconClickedId = 0;
            }

            if (this._searchTimeoutId > 0) {
                Mainloop.source_remove(this._searchTimeoutId);
                this._searchTimeoutId = 0;
            }

            this._entry.set_secondary_icon(null);
            this._searchCancelled();
        }
    },

    _onKeyPress: function(entry, event) {
        let symbol = event.get_key_symbol();
        if (symbol == Clutter.Escape) {
            if (this._isActivated()) {
                this.reset();
                return true;
            }
        } else if (this._searchActive) {
            let arrowNext, nextDirection;
            if (entry.get_text_direction() == Clutter.TextDirection.RTL) {
                arrowNext = Clutter.Left;
                nextDirection = Gtk.DirectionType.LEFT;
            } else {
                arrowNext = Clutter.Right;
                nextDirection = Gtk.DirectionType.RIGHT;
            }

            if (symbol == Clutter.Tab) {
                this._searchResults.navigateFocus(Gtk.DirectionType.TAB_FORWARD);
                return true;
            } else if (symbol == Clutter.ISO_Left_Tab) {
                this._focusTrap.can_focus = false;
                this._searchResults.navigateFocus(Gtk.DirectionType.TAB_BACKWARD);
                this._focusTrap.can_focus = true;
                return true;
            } else if (symbol == Clutter.Down) {
                this._searchResults.navigateFocus(Gtk.DirectionType.DOWN);
                return true;
            } else if (symbol == arrowNext && this._text.position == -1) {
                this._searchResults.navigateFocus(nextDirection);
                return true;
            } else if (symbol == Clutter.Return || symbol == Clutter.KP_Enter) {
                // We can't connect to 'activate' here because search providers
                // might want to do something with the modifiers in activateDefault.
                if (this._searchTimeoutId > 0) {
                    Mainloop.source_remove(this._searchTimeoutId);
                    this._doSearch();
                }
                this._searchResults.activateDefault();
                return true;
            }
        }
        return false;
    },

    _onCapturedEvent: function(actor, event) {
        if (event.type() == Clutter.EventType.BUTTON_PRESS) {
            let source = event.get_source();
            if (source != this._text && this._text.text == '' &&
                !Main.layoutManager.keyboardBox.contains(source)) {
                // the user clicked outside after activating the entry, but
                // with no search term entered and no keyboard button pressed
                // - cancel the search
                this.reset();
            }
        }

        return false;
    },

    _doSearch: function () {
        this._searchTimeoutId = 0;

        let terms = getTermsForSearchString(this._entry.get_text());

        this._searchSystem.updateSearchResults(terms);
        this._showPage(this._searchPage);
    },

    _shouldUseSearchProvider: function(provider) {
        // the disable-external GSetting only affects remote providers
        if (!provider.isRemoteProvider)
            return true;

        if (this._searchSettings.get_boolean('disable-external'))
            return false;

        let appId = provider.appInfo.get_id();
        let disable = this._searchSettings.get_strv('disabled');
        return disable.indexOf(appId) == -1;
    },

    _reloadRemoteProviders: function() {
        // removeSearchProvider() modifies the provider list we iterate on,
        // so make a copy first
        let remoteProviders = this._searchSystem.getRemoteProviders().slice(0);

        remoteProviders.forEach(Lang.bind(this, this.removeSearchProvider));
        RemoteSearch.loadRemoteSearchProviders(Lang.bind(this, this.addSearchProvider));
    },

    addSearchProvider: function(provider) {
        if (!this._shouldUseSearchProvider(provider))
            return;

        this._searchSystem.registerProvider(provider);
        this._searchResults.createProviderMeta(provider);
    },

    removeSearchProvider: function(provider) {
        this._searchSystem.unregisterProvider(provider);
        this._searchResults.destroyProviderMeta(provider);
    },

    getActivePage: function() {
        if (this._activePage == this._workspacesPage)
            return ViewPage.WINDOWS;
        else if (this._activePage == this._appsPage)
            return ViewPage.APPS;
        else
            return ViewPage.SEARCH;
    },

    fadeIn: function() {
        let actor = this._activePage;
        Tweener.addTween(actor, { opacity: 255,
                                  time: OverviewControls.SIDE_CONTROLS_ANIMATION_TIME / 2,
                                  transition: 'easeInQuad'
                                });
    },

    fadeHalf: function() {
        let actor = this._activePage;
        Tweener.addTween(actor, { opacity: 128,
                                  time: OverviewControls.SIDE_CONTROLS_ANIMATION_TIME / 2,
                                  transition: 'easeOutQuad'
                                });
    }
});
Signals.addSignalMethods(ViewSelector.prototype);
