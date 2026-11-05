---
layout: post
title: 投资计算器
date: 2024-04-05 T0:00:00 +08:00
categories: posts
---

{% include JavaScripts.html %}

<div>
    <label class="ICAlbl" for="ICAexchange">Data source:</label>
    <select id="ICAexchange">
        <option value="">Manual</option>
        <option value="kraken">Kraken</option>
        <option value="binance">Binance</option>
        <option value="coinbase">Coinbase</option>
    </select>
    <label for="ICApair">Pair:</label>
    <select id="ICApair" disabled><option value="">Select an exchange</option></select>
    <label for="ICArefresh">Every</label>
    <input id="ICArefresh" type="number" value="5" min="1" step="1" style="width: 4ch; text-align: right"> s
    <div><span id="ICAquoteStatus" role="status" aria-live="polite">Manual entry</span> <span id="ICAcountdown" aria-hidden="true" style="font-variant-numeric: tabular-nums"></span></div>
</div>
<script>
(function(){
    var mid = function(bid, ask){ return +((Number(bid) + Number(ask)) / 2).toPrecision(12); };
    var sources = {
        kraken: {
            kind: "Mid",
            pairs: "https://api.kraken.com/0/public/AssetPairs",
            list: function(data){
                if(data.error.length){ throw new Error(data.error.join(", ")); }
                return Object.entries(data.result)
                    .filter(function(item){ return item[1].status == "online" && item[1].wsname; })
                    .map(function(item){ return {id: item[0], label: item[1].wsname}; });
            },
            quote: function(pair){ return "https://api.kraken.com/0/public/Ticker?pair=" + encodeURIComponent(pair); },
            price: function(data){
                if(data.error.length){ throw new Error(data.error.join(", ")); }
                var ticker = Object.values(data.result)[0];
                return mid(ticker.b[0], ticker.a[0]);
            }
        },
        binance: {
            kind: "Index",
            pairs: "https://fapi.binance.com/fapi/v1/exchangeInfo",
            list: function(data){
                return data.symbols.filter(function(item){ return item.status == "TRADING" && item.contractType == "PERPETUAL"; })
                    .map(function(item){ return {id: item.symbol, label: item.baseAsset + "/" + item.quoteAsset}; });
            },
            quote: function(pair){ return "https://fapi.binance.com/fapi/v1/premiumIndex?symbol=" + encodeURIComponent(pair); },
            price: function(data){ return data.indexPrice; }
        },
        coinbase: {
            kind: "Mid",
            pairs: "https://api.exchange.coinbase.com/products",
            list: function(data){
                return data.filter(function(item){ return item.status == "online" && !item.trading_disabled; })
                    .map(function(item){ return {id: item.id, label: item.base_currency + "/" + item.quote_currency}; });
            },
            quote: function(pair){ return "https://api.exchange.coinbase.com/products/" + encodeURIComponent(pair) + "/ticker"; },
            price: function(data){ return mid(data.bid, data.ask); }
        }
    };
    document.addEventListener("DOMContentLoaded", function(){
        var exchange = document.getElementById("ICAexchange");
        var pair = document.getElementById("ICApair");
        var entry = document.getElementById("ICAbuyPrice");
        var status = document.getElementById("ICAquoteStatus");
        var countdown = document.getElementById("ICAcountdown");
        var refresh = document.getElementById("ICArefresh");
        var listRequest, quoteRequest;
        var storageKey = "investmentCalculator.market", savedPair = "";
        var nextAt = 0;
        function refreshSeconds(){
            return Math.max(1, Math.round(Number(refresh.value)) || 5);
        }
        function saveSelection(){
            try {
                localStorage.setItem(storageKey, JSON.stringify({exchange: exchange.value, pair: pair.value, refresh: refreshSeconds()}));
            } catch(error){
                console.error("Cannot save market selection:", error);
            }
        }
        async function json(url, signal){
            var response = await fetch(url, {signal: signal, credentials: "omit"});
            if(!response.ok){ throw new Error("HTTP " + response.status); }
            return response.json();
        }
        function notify(text, error){
            if(status.textContent !== text){ status.textContent = text; }
            var color = error ? "red" : "";
            if(status.style.color !== color){ status.style.color = color; }
        }
        function cancelQuote(){
            if(quoteRequest){ quoteRequest.abort(); quoteRequest = null; }
        }
        function tick(){
            var live = Boolean(exchange.value && pair.value);
            if(live && !quoteRequest && Date.now() >= nextAt){ refreshQuote(); }
            var text = live && !quoteRequest ? "· next in " + Math.max(0, Math.ceil((nextAt - Date.now()) / 1000)) + " s" : "";
            if(countdown.textContent !== text){ countdown.textContent = text; }
        }
        function syncEntry(){
            cancelQuote();
            entry.readOnly = Boolean(exchange.value && pair.value);
            if(entry.readOnly){ entry.value = ""; }
            entry.dispatchEvent(new Event("input", {bubbles: true}));
            nextAt = 0;
            if(entry.readOnly){ notify("Loading quote..."); tick(); }
            else { notify("Manual entry"); }
        }
        async function refreshQuote(){
            var source = sources[exchange.value], symbol = pair.value;
            if(!source || !symbol || quoteRequest){ return; }
            var request = new AbortController();
            quoteRequest = request;
            var timeout = setTimeout(function(){ request.abort(); }, 10000);
            try {
                var price = source.price(await json(source.quote(symbol), request.signal));
                if(quoteRequest !== request){ return; }
                if(!Number.isFinite(Number(price)) || Number(price) <= 0){ throw new Error("Invalid quote"); }
                entry.value = String(price);
                entry.dispatchEvent(new Event("input", {bubbles: true}));
                notify("Live · " + pair.options[pair.selectedIndex].text + " · " + source.kind);
            } catch(error){
                if(quoteRequest === request){
                    notify("Quote unavailable: " + error.message + " · Entry may be stale", true);
                }
            } finally {
                clearTimeout(timeout);
                if(quoteRequest === request){
                    quoteRequest = null;
                    nextAt = Date.now() + refreshSeconds() * 1000;
                    tick();
                }
            }
        }
        async function refreshPairs(){
            var source = sources[exchange.value];
            if(!source || listRequest){ return; }
            var request = new AbortController();
            listRequest = request;
            var timeout = setTimeout(function(){ request.abort(); }, 10000);
            if(!pair.value){ notify("Loading pairs..."); }
            try {
                var items = source.list(await json(source.pairs, request.signal));
                if(listRequest !== request){ return; }
                if(!items.length){ throw new Error("No supported pairs returned"); }
                items.sort(function(a, b){ return a.label.localeCompare(b.label); });
                var restoring = Boolean(savedPair);
                var selected = pair.value || savedPair;
                savedPair = "";
                pair.replaceChildren(new Option("Select a pair", ""));
                items.forEach(function(item){ pair.add(new Option(item.label, item.id)); });
                pair.value = selected;
                if(pair.selectedIndex < 0){ pair.value = ""; }
                if(!pair.value){ notify("Select a pair"); }
                if(restoring || (selected && !pair.value)){ syncEntry(); saveSelection(); }
            } catch(error){
                if(listRequest === request){ notify("Cannot refresh pairs: " + error.message + ". Open the list to retry.", true); }
            } finally {
                clearTimeout(timeout);
                if(listRequest === request){ listRequest = null; }
            }
        }
        exchange.addEventListener("change", function(){
            if(listRequest){ listRequest.abort(); listRequest = null; }
            savedPair = "";
            pair.replaceChildren(new Option(exchange.value ? "Select a pair" : "Select an exchange", ""));
            pair.disabled = !exchange.value;
            saveSelection();
            syncEntry();
            refreshPairs();
        });
        pair.addEventListener("pointerdown", refreshPairs);
        pair.addEventListener("keydown", function(event){
            if(["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)){ refreshPairs(); }
        });
        pair.addEventListener("change", function(){ savedPair = ""; saveSelection(); syncEntry(); });
        refresh.addEventListener("change", function(){
            refresh.value = refreshSeconds();
            saveSelection();
            if(!quoteRequest && nextAt){ nextAt = Date.now() + refreshSeconds() * 1000; tick(); }
        });
        try {
            var saved = JSON.parse(localStorage.getItem(storageKey));
            if(saved && Number(saved.refresh) >= 1){ refresh.value = Math.round(Number(saved.refresh)); }
            if(saved && Object.prototype.hasOwnProperty.call(sources, saved.exchange)){
                exchange.value = saved.exchange;
                savedPair = typeof saved.pair == "string" ? saved.pair : "";
                pair.disabled = false;
                refreshPairs();
            }
        } catch(error){
            console.error("Cannot restore market selection:", error);
        }
        setInterval(tick, 250);
    });
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
        var lastKey = "", wasMargin = false, formKey = "investmentCalculator.form";
        function saveForm(){
            var state = {};
            document.querySelectorAll("#ICAtable input").forEach(function(el){
                if(el.type == "radio"){ if(el.checked){ state[el.name] = el.value; } }
                else if(el.id && !el.readOnly){ state[el.id] = el.value; }
            });
            try { localStorage.setItem(formKey, JSON.stringify(state)); }
            catch(error){ console.error("Cannot save calculator settings:", error); }
        }
        function restoreForm(){
            try {
                var state = JSON.parse(localStorage.getItem(formKey)) || {};
                document.querySelectorAll("#ICAtable input").forEach(function(el){
                    if(el.type == "radio"){ if(typeof state[el.name] == "string"){ el.checked = el.value == state[el.name]; } }
                    else if(el.id && typeof state[el.id] == "string" && !el.readOnly){ el.value = state[el.id]; }
                });
            } catch(error){ console.error("Cannot restore calculator settings:", error); }
            wasMargin = radio("ICAmarket") == "margin";
        }
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
        document.addEventListener("DOMContentLoaded", function(){
            restoreForm();
            $("ICAtable").addEventListener("input", update);
            $("ICAtable").addEventListener("change", update);
            $("ICAtable").addEventListener("input", saveForm);
            $("ICAtable").addEventListener("change", saveForm);
            setInterval(update, 1000);
            update();
        });
    })();
</script>
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
