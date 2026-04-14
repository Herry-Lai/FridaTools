module.exports = {
    init() {
        start_hidden_option();
    }
};

/**
 * 时装潜能相关
 */
function hidden_option() {
	//关闭系统分配属性
	Memory.protect(ptr(0x08509D49), 3, 'rwx');
	ptr(0x08509D49).writeByteArray([0xEB]);

	//下发时装潜能属性
	Memory.protect(ptr(0x08509D34), 3, 'rwx');
	ptr(0x08509D34).writeUShort(random_int(1, 64)); //属性(1 ~ 63)
}

function start_hidden_option() {
	Interceptor.attach(ptr(0x08509B9E), {
		onEnter: function (args) {
			hidden_option(); //go~~~
		},
		onLeave: function (retval) {}
	});

	Interceptor.attach(ptr(0x0817EDEC), {
		onEnter: function (args) {},
		onLeave: function (retval) {
			retval.replace(1); //return 1;
		}
	});
}