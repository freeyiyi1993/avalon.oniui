/**
  * @description loading组件，实现各种加载动画效果
  *
  */
define(["avalon", "text!./avalon.loading.html", "text!./avalon.loading.bar.html", "css!./avalon.loading.css", "css!../chameleon/oniui-common.css"], function(avalon, template, ballTemplate) {
    var count = 0, 
        _key = (99999 - Math.random() * 10000) >> 0,
        templateCache = {},
        parts = ballTemplate.split("{{MS_WIDGET_TYPE}}"),
        _config = {
            "ball": {
                "width": 46,
                "widthInner": 6,
                "count": 12,
                "color": "#ffffff"
            }    
        }
        avalon.each(parts, function(i, item) {
            var type,
                item = item.replace(/^\{\{MS_WIDGET_[^\}]+\}\}/g, function(mat) {
                    type = mat.replace(/\{\{MS_WIDGET_|\}\}/g, "")
                    return ""
            })
            if(type) {
                type = type.toLowerCase()
                item = item.split("{{MS_WIDGET_DIVIDER}}")
                templateCache[type] = {
                    "svg": item[1],
                    "vml": item[0]
                }
            }
        })
    // 计算每个loading效果单元的位置
    // 如下，是一个圆形排列阵列
    function ComputePoints(point, radiusOut, radiusInner) {
        var points = [],
            i = 0,
            angel,
            opacities = []
        while( i < point) {
            angel = (1 - i * 2 / point) * Math.PI
            points.push(
                {
                    "x": (radiusOut - radiusInner) *　(Math.cos(angel) + 1),
                    "y": (radiusInner - radiusOut) * (Math.sin(angel) - 1),
                    "r": radiusInner
                }
            )
            opacities.push((i / (point - 1)).toFixed(2))
            i = points.length
        }
        return [points, opacities]
    }
    var widget = avalon.ui.loading = function(element, data, vmodels) {
        var svgSupport = !!document.createElementNS && !!document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect
        
        var options = data.loadingOptions
        //方便用户对原始模板进行修改,提高定制性
        options.template = options.getTemplate(template, options)

        var vmodel = avalon.define(data.loadingId, function(vm) {
            avalon.mix(vm, options)
            vm.widgetElement = element
            vm.svgSupport = svgSupport
            vm.$loadingID = count + "" + _key
            vm.data = []
            vm.opacities = []
            vm.html = ""
            vm._type = ""
            vm.$timer = ""
            vm.height = "auto"
            vm.width = "auto"
            vm.$config = {}
            vm.$skipArray = ["widgetElement", "template"]

            var inited
            vm.$init = function() {
                if(inited) return
                inited = true
                var id,
                    container = options.container || vmodel.widgetElement,
                    elementParent = ((avalon.type(container) === "object" && container.nodeType === 1 && document.body.contains(container)) ? container : document.getElementById(container)) || document.body
                // if(!svgSupport &&  document.namespaces &&  !document.namespaces["v"]) {
                //     document.namespaces.add("v", "urn:schemas-microsoft-com:vml")
                // }
                var type = vmodel.type.type || vmodel.type
                if(!templateCache[type]) {
                    vmodel._type = "ball"
                }
                var _cf = avalon.mix({}, _config[type], vmodel.type),
                    radiusInner = _cf.widthInner / 2,
                    radiusOut = _cf.width / 2
                    list = ComputePoints(_cf.count, radiusOut, radiusInner),
                    html = ""
                vmodel.$config = _config
                vmodel.data = list[0]
                vmodel.opacities = list[1]
                vmodel.width = _cf.width === void 0 ? _cf.height : _cf.width
                vmodel.height = _cf.height === void 0 ? _cf.width : _cf.height
                if(vmodel.svgSupport) {
                    var tpl = templateCache[vmodel.type]["svg"]
                    html += tpl.replace(/\{\{MS_WIDGET_CSS_BINDINGS\}\}/g, 
                            [
                                "ms-css-opacity=\"opacities[$index]\"",
                                "ms-attr-r=\"data[$index].r\"",
                                "ms-attr-cx=\"data[$index].x+" + radiusInner + "\"",
                                "ms-attr-cy=\"data[$index].y+" + radiusInner + "\""
                            ].join(" "))
                } else {
                    var tpl = templateCache[vmodel.type]["vml"]
                    // vml cloneNode有问题，用拼接字符串来解决
                    avalon.each(vmodel.data, function(i, item) {
                        html += tpl.replace(/\{\{MS_WIDGET_CSS_BALL\}\}/g, 
                            [
                                "left:" + item.x + "px;",
                                "top:" + item.y + "px;",
                                "width:" + radiusInner * 2 + "px;",
                                "height:" + radiusInner * 2 + "px;"
                            ].join("")).replace(/\{\{MS_WIDGET_CSS_BINDINGS\}\}/g, 
                            [
                                "ms-css-opacity=\"" + vmodel.getOpacity(i) + "\""
                            ].join(" "))
                    })
                }
                elementParent.appendChild(avalon.parseHTML(vmodel.template.replace("{{MS_WIDGET_HTML}}", html).replace("{{MS_WIDGET_ID}}", vmodel.$loadingID))) 
                avalon.scan(elementParent, [vmodel].concat(vmodels))
                if(typeof options.onInit === "function" ) {
                    //vmodels是不包括vmodel的 
                    options.onInit.call(element, vmodel, options, vmodels)
                    vmodel.effect()
                }
            }
            vm.effect = function() {
                if(vmodel.toggle) {
                    var ele = document.getElementById("ui-loading-" + vmodel.$loadingID)
                    if(ele) {
                        ele = vmodel.svgSupport ? ele.getElementsByTagName("circle") : ele.getElementsByTagName("oval")
                        var len = ele.length, index = 12, eles = []
                        avalon.each(ele, function(i, item) {
                            eles.push(avalon(item))
                            // fix ie 7-8 render bug...
                            if(i === len - 1 && !vmodel.svgSupport) {
                                item.style.display = "none"
                                item.style.display = "block"
                            }
                        })
                        clearInterval(vmodel.$timer)
                        vmodel.$timer = setInterval(function() {
                            // 顺时针
                            index--;
                            if(index < 0) {
                                index = len
                            }
                            for(var i = 0; i < len; i++) {
                                eles[i].css("opacity", vmodel.opacities[(i + index) % len] * 100 / 100)
                            }
                        }, vmodel.timer)
                    }
                }
            }
            vm.getOpacity = function(index) {
                return vmodel.opacities[index]
            }
            vm.$remove = function() {
                clearInterval(vmodel.$timer)
                element.innerHTML = element.textContent = ""
            }

            //@method showLoading() 显示loading效果
            vm.showLoading = function() {
                if(vmodel.toggle) return
                vmodel.toggle = true
                vmodel.effect()
            } 
            //@method hideLoading() 隐藏loading
            vm.hideLoading = function() {
                vmodel.toggle = false
            }
            //@method destroyLoading() 销毁loading
            vm.destroyLoading = function() {
                vmodel.toggle = false
                vmodel.$remove()
            }

        })

        vmodel.$watch("toggle", function(n) {
            if(!n) {
                clearInterval(vmodel.$timer)
            } else {
                vmodel.effect()
            }
        })
      
        count++

        return vmodel
    }
    //add args like this:
    //argName: defaultValue, \/\/@param description
    //methodName: code, \/\/@optMethod optMethodName(args) description 
    widget.defaults = {
        //@optMethod onInit(vmodel, options, vmodels) 完成初始化之后的回调,call as element's method
        onInit: avalon.noop,
        timer: 160,//@param 毫秒数，动画效果帧间隔
        type: "ball", //@param 类型，默认是ball，球，可以配置成 {"type": "ball", "widthInner": 3} ...
        toggle: true, //@param 是否显示
        modal: true, //@param 是否显示遮罩
        opacity: 0.1,//@param 遮罩透明度
        container: void 0,//@param loading效果显示的容器，默认是绑定widget的元素
        getTemplate: function(tmpl, opts, tplName) {
            return tmpl
        },//@optMethod getTemplate(tpl, opts, tplName) 定制修改模板接口
        $author: "skipper@123"
    }
})