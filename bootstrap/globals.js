const _ = {};

global.$inject = (name, obj) => {
    _[name] = obj;
};

global.$eject = name => {
    delete _[name];
};

global.$use = name => _[name];
