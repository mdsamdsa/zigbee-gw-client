'use strict';

var module_name = module.filename.slice(module.filename.lastIndexOf(require('path').sep)+1, module.filename.length -3);

var log4js = require('log4js');
var logger = log4js.getLogger(module_name);

function IdleCallback(func, arg, num) {
    this.func = func;
    this.arg = arg;
    this.num = num;
}

function Idle() {
    this.idle_cb_list = [];
}

var idle_cb_count = 0;

Idle.prototype.register_idle_callback = function(func, arg) {
    this.idle_cb_list.push(new IdleCallback(func, arg, ++idle_cb_count));
    logger.info('Created new idle_cb entry (' + idle_cb_count + ')  (' + this.idle_cb_list.length +')');
};

Idle.prototype.unregister_idle_callback = function() {
    if (this.idle_cb_list.length != 0)
    {
        logger.info('Unregistering idle_cb (' + this.idle_cb_list[0].num + ')');
        this.idle_cb_list.shift();
    }

    this.do_idle_callback(false);
};

Idle.prototype.do_idle_callback = function(timed_out)
{
    if (this.idle_cb_list.length != 0) //if the current entry is the first in the list
    {
        this.idle_cb_list[0].func(timed_out, this.idle_cb_list[0].arg);
    }
};

var idle = new Idle();

module.exports = idle;