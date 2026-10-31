---
layout: post
title: 投资计算器
date: 2024-04-05 T0:00:00 +08:00
categories: posts
---

{% include JavaScripts.html %}

<script>
    (function(){
        var $ = function(id){ return document.getElementById(id); };
        var num = function(id){ return parseFloat($(id).value); };
        var radio = function(name){
            var el = document.querySelector("input[name=" + name + "]:checked");
            return el && el.value;
        };
        var MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];
        var pad = function(n){ return (n < 10 ? "0" : "") + n; };
        var fmt = function(d){
            return MONTHS[d.getMonth()] + " " + d.getDate() + " / " + d.getFullYear() + ", " +
                pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
        };
        var setOut = function(id, text, color){
            $(id).textContent = text;
            $(id).style.color = color || "";
        };
        var lastKey = "", wasMargin = false;

        function update(){
            var isMargin = radio("ICAmarket") == "margin";
            if(!isMargin){ $("ICAlongRadio").checked = true; }
            else if(!wasMargin){ $("ICAshortRadio").checked = true; }
            wasMargin = isMargin;
            var isShort = radio("ICAdirection") == "short";
            ["ICAlongRadio", "ICAshortRadio", "ICAleverage", "ICAinterestRate", "ICAunitHours", "ICAperiods", "ICAheld"]
                .forEach(function(id){ $(id).disabled = !isMargin; });

            var entry = num("ICAbuyPrice"), exit = num("ICAsellPrice");
            var fee = num(radio("ICAtradeMethod") == "make" ? "ICAmakeRate" : "ICAtakeRate") / 100;
            var leverage = isMargin ? Math.max(num("ICAleverage") || 1, 1) : 1;
            var interest = isMargin ? num("ICAinterestRate") / 100 : 0;
            var unitHours = num("ICAunitHours") || 1;
            var periods = Math.min(Math.max(parseInt($("ICAperiods").value) || 0, 0), 1000);
            var held = Math.ceil((num("ICAheld") || 0) / unitHours - 1e-9);

            var interestPerPeriod = interest * (isShort ? 1 : (leverage - 1) / leverage);
            var cost = function(t){ return entry * interestPerPeriod * t; };
            var price = function(t, margin){
                return isShort
                    ? (entry * (1 - fee) - cost(t) + margin) / (1 + fee)
                    : (entry * (1 + fee) + cost(t) - margin) / (1 - fee);
            };
            var breakEven = function(t){ return price(t, 0); };
            var liq = function(t){ return price(t, entry / leverage); };

            var endHours = "NaN", endClock = "NaN";
            if(isMargin){
                var room = 1 / leverage - 2 * fee;
                endHours = room <= 0 ? "0" : interestPerPeriod <= 0 ? "∞" : +(Math.ceil(room / interestPerPeriod) * unitHours).toFixed(4);
                if(endHours !== "∞"){ endClock = fmt(new Date(Date.now() + endHours * 3600000)); }
            }
            setOut("ICAmaxTime", endHours);
            setOut("ICAendClock", endClock);
            setOut("ICAliqPrice", isMargin && !isNaN(entry) ? liq(held).toFixed(2) : "NaN");
            setOut("ICAsellLimit", isNaN(entry) ? "NaN" : breakEven(held).toFixed(2),
                isNaN(entry) || isNaN(exit) ? "" : (breakEven(held) > exit) != isShort ? "red" : "green");

            var pnl = (isShort ? entry * (1 - fee) - exit * (1 + fee) : exit * (1 - fee) - entry * (1 + fee)) - cost(held);
            var profit = pnl * leverage / entry * 100;
            setOut("ICAprofitRate", isNaN(profit) ? "NaN" : profit.toFixed(2) + "%",
                isNaN(profit) || profit == 0 ? "" : profit > 0 ? "green" : "red");

            var key = [isMargin, isShort, fee, entry, leverage, interest, unitHours, periods, Math.floor(Date.now() / 1000)].join("|");
            if(key == lastKey){ return; }
            lastKey = key;
            var now = new Date(), html = "";
            $("ICAcalcTime").textContent = fmt(now);
            if(isNaN(entry)){
                html = "<tr><td colspan=\"4\">Enter an entry price</td></tr>";
            }
            for(var t = 0; t <= periods && !isNaN(entry); t++){
                html += "<tr><td>" + +(t * unitHours).toFixed(4) + "</td><td>" + fmt(new Date(now.getTime() + t * unitHours * 3600000)) +
                    "</td><td>" + breakEven(t).toFixed(2) + "</td><td>" + (isMargin ? liq(t).toFixed(2) : "-") + "</td></tr>";
            }
            $("ICAforecastBody").innerHTML = html;
        }
        $("ICAtable").addEventListener("input", update);
        $("ICAtable").addEventListener("change", update);
        setInterval(update, 1000);
        update();
    })();
</script>

<style>
    .ICAlbl { display: inline-block; min-width: 11ch; }
    #ICAtable td, #ICAtable th { text-align: left; }
    #ICAtable input { text-align: right; }
    #ICAtable input[type=number] { -moz-appearance: textfield; appearance: textfield; }
    #ICAtable input[type=number]::-webkit-inner-spin-button,
    #ICAtable input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
</style>

<table id="ICAtable" border="1" align="center" cellpadding="0">
    <thead>
        <tr>
            <th>Investment Calculator</th>
        </tr>
    </thead>
    <tbody>
    <tr align="left">
        <td>
            <span class="ICAlbl">Price:</span>
            Entry 
            <input id="ICAbuyPrice" type="number" value="" style="width: 7ch">
            Close 
            <input id="ICAsellPrice" type="number" value="" style="width: 7ch">
            <br>
            <span class="ICAlbl">Order type:</span>
            <input type="radio" id="ICAmakeRadio" name="ICAtradeMethod" value="make" checked />
            <label for="ICAmakeRadio">Maker<input id="ICAmakeRate" type="number" value="0.40" style="width: 4ch">%</label>
            <input type="radio" id="ICAtakeRadio" name="ICAtradeMethod" value="take" />
            <label for="ICAtakeRadio">Taker</label>
            <input id="ICAtakeRate" type="number" value="0.80" style="width: 4ch">%
            <br>
            <span class="ICAlbl">Market:</span>
            <input type="radio" id="ICAspotRadio" name="ICAmarket" value="spot" checked />
            <label for="ICAspotRadio">Spot</label>
            <input type="radio" id="ICAmarginRadio" name="ICAmarket" value="margin" />
            <label for="ICAmarginRadio">Margin</label>
            <input id="ICAleverage" type="number" value="3" min="1" style="width: 3ch">x
            <br>
            <span class="ICAlbl">Direction:</span>
            <input type="radio" id="ICAlongRadio" name="ICAdirection" value="long" checked />
            <label for="ICAlongRadio">Long</label>
            <input type="radio" id="ICAshortRadio" name="ICAdirection" value="short" />
            <label for="ICAshortRadio">Short</label>
            <br>
            <span class="ICAlbl">Outlook:</span>
            Rate 
            <input id="ICAinterestRate" type="number" value="0.02" step="any" style="width: 4ch">% /
            <input id="ICAunitHours" type="number" value="4" min="0" step="any" style="width: 2ch"> h & 
            Hold
            <input id="ICAheld" type="number" value="4" min="0" step="any" style="width: 4ch"> h
            <br>
            <span class="ICAlbl">Break-even:</span>
            <span id="ICAsellLimit"></span>
            (Liquidation 
            <span id="ICAliqPrice"></span>
            )
            <br>
            <span class="ICAlbl">Return:</span>
            <span id="ICAprofitRate"></span>
        </td>
    </tr>
    </tbody>
    <tbody>
    <tr>
        <th>Margin Outlook</th>
    </tr>
    <tr align="left">
        <td>
            <span class="ICAlbl">Calc. at:</span>
            <span id="ICAcalcTime"></span>
            <br>
            <span class="ICAlbl">Display periods:</span>
            <input id="ICAperiods" type="number" value="3" min="0" max="1000" style="width: 3ch">
            <br>
            <table border="1" align="center">
                <thead><tr><th>T(h)</th><th>Exp. time</th><th>Break</th><th>Liquidation</th></tr></thead>
                <tbody id="ICAforecastBody"></tbody>
            </table>
            <br>
            <span class="ICAlbl">End time:</span>
            <span id="ICAendClock"></span>
            (
            <span id="ICAmaxTime"></span> h
            )
        </td>
    </tr>
    </tbody>
</table>


<p align="right">Yuki N.</p>  
