import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

const TIMEFRAMES = [
  { key: '1s', label: '1s', seconds: 1, count: 200 },
  { key: '5s', label: '5s', seconds: 5, count: 150 },
  { key: '1m', label: '1m', seconds: 60, count: 120 },
  { key: '5m', label: '5m', seconds: 300, count: 100 },
  { key: '15m', label: '15m', seconds: 900, count: 80 },
  { key: '1H', label: '1H', seconds: 3600, count: 60 },
];

const INDICATORS = {
  SMA: { name: 'SMA 20', period: 20, color: '#f59e0b' },
  EMA: { name: 'EMA 9', period: 9, color: '#3a86ff' },
  BB: { name: 'Bollinger', period: 20, color: '#9d4edd' },
};

// Calculate SMA
const calcSMA = (data, period) => {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    result.push({ time: data[i].time, value: parseFloat((sum / period).toFixed(5)) });
  }
  return result;
};

// Calculate EMA
const calcEMA = (data, period) => {
  const result = [];
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((s, d) => s + d.close, 0) / period;
  result.push({ time: data[period - 1].time, value: parseFloat(ema.toFixed(5)) });
  for (let i = period; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k);
    result.push({ time: data[i].time, value: parseFloat(ema.toFixed(5)) });
  }
  return result;
};

// Calculate Bollinger Bands
const calcBB = (data, period) => {
  const upper = [], lower = [], middle = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    const avg = sum / period;
    let variance = 0;
    for (let j = 0; j < period; j++) variance += Math.pow(data[i - j].close - avg, 2);
    const std = Math.sqrt(variance / period);
    middle.push({ time: data[i].time, value: parseFloat(avg.toFixed(5)) });
    upper.push({ time: data[i].time, value: parseFloat((avg + 2 * std).toFixed(5)) });
    lower.push({ time: data[i].time, value: parseFloat((avg - 2 * std).toFixed(5)) });
  }
  return { upper, middle, lower };
};

const TradingChart = ({ asset, currentPrice, assetType, onTimeframeChange }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const indicatorSeriesRef = useRef({});
  const chartDataRef = useRef([]);
  const [selectedTF, setSelectedTF] = useState('1m');
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);
  const lastUpdateRef = useRef(0);

  const decimals = assetType === 'forex' ? 5 : 2;

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
        fontFamily: "'JetBrains Mono', 'Inter', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(58, 134, 255, 0.4)', width: 1, style: 2, labelBackgroundColor: '#3a86ff' },
        horzLine: { color: 'rgba(58, 134, 255, 0.4)', width: 1, style: 2, labelBackgroundColor: '#3a86ff' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        scaleMargins: { top: 0.05, bottom: 0.2 },
        entireTextOnly: true,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.06)',
        timeVisible: true,
        secondsVisible: selectedTF === '1s' || selectedTF === '5s',
        fixLeftEdge: true,
        fixRightEdge: true,
        barSpacing: 8,
      },
      handleScroll: { vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true },
      localization: {
        locale: 'en-US',
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#00e676',
      downColor: '#ff1744',
      borderUpColor: '#00e676',
      borderDownColor: '#ff1744',
      wickUpColor: 'rgba(0, 230, 118, 0.6)',
      wickDownColor: 'rgba(255, 23, 68, 0.6)',
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      indicatorSeriesRef.current = {};
    };
  }, []);

  // Generate historical data based on timeframe
  const generateData = useCallback((price, tf) => {
    const config = TIMEFRAMES.find(t => t.key === tf) || TIMEFRAMES[2];
    const candles = [];
    const volumes = [];
    let p = price;
    const now = Math.floor(Date.now() / 1000);
    const vol = assetType === 'crypto' ? 0.003 : assetType === 'metals' ? 0.001 : 0.0003;
    const tfVol = vol * Math.sqrt(config.seconds / 60);

    for (let i = config.count; i >= 0; i--) {
      const time = now - i * config.seconds;
      const change = (Math.random() - 0.5) * 2 * tfVol * p;
      const open = p;
      const close = p + change;
      const high = Math.max(open, close) * (1 + Math.random() * tfVol * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * tfVol * 0.5);

      candles.push({
        time,
        open: parseFloat(open.toFixed(decimals)),
        high: parseFloat(high.toFixed(decimals)),
        low: parseFloat(low.toFixed(decimals)),
        close: parseFloat(close.toFixed(decimals)),
      });

      const isGreen = close >= open;
      volumes.push({
        time,
        value: Math.random() * 800000 + 200000,
        color: isGreen ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 23, 68, 0.15)',
      });

      p = close;
    }
    return { candles, volumes };
  }, [assetType, decimals]);

  // Update chart data when asset or timeframe changes
  useEffect(() => {
    if (!currentPrice || currentPrice === 0 || !candleSeriesRef.current) return;

    const { candles, volumes } = generateData(currentPrice, selectedTF);
    chartDataRef.current = candles;
    candleSeriesRef.current.setData(candles);
    volumeSeriesRef.current.setData(volumes);

    // Recalculate indicators
    updateIndicators(candles);

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      chartRef.current.applyOptions({
        timeScale: { secondsVisible: selectedTF === '1s' || selectedTF === '5s' },
      });
    }
  }, [asset, currentPrice, selectedTF, assetType]);

  // Real-time candle updates
  useEffect(() => {
    if (!currentPrice || !candleSeriesRef.current || chartDataRef.current.length === 0) return;

    const config = TIMEFRAMES.find(t => t.key === selectedTF) || TIMEFRAMES[2];
    const updateMs = Math.min(config.seconds * 200, 1000); // Update frequency

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const data = chartDataRef.current;
      const last = data[data.length - 1];
      if (!last) return;

      const vol = assetType === 'crypto' ? 0.001 : assetType === 'metals' ? 0.0004 : 0.0001;
      const tick = currentPrice + (Math.random() - 0.5) * 2 * vol * currentPrice;

      if (now - last.time >= config.seconds) {
        // New candle
        const newCandle = {
          time: now,
          open: parseFloat(tick.toFixed(decimals)),
          high: parseFloat(tick.toFixed(decimals)),
          low: parseFloat(tick.toFixed(decimals)),
          close: parseFloat(tick.toFixed(decimals)),
        };
        chartDataRef.current = [...data.slice(-config.count), newCandle];
        candleSeriesRef.current.update(newCandle);
        volumeSeriesRef.current.update({
          time: now,
          value: Math.random() * 500000 + 100000,
          color: 'rgba(0, 230, 118, 0.1)',
        });
      } else {
        // Update current candle
        const updated = {
          ...last,
          high: Math.max(last.high, parseFloat(tick.toFixed(decimals))),
          low: Math.min(last.low, parseFloat(tick.toFixed(decimals))),
          close: parseFloat(tick.toFixed(decimals)),
        };
        chartDataRef.current[data.length - 1] = updated;
        candleSeriesRef.current.update(updated);

        const isGreen = updated.close >= updated.open;
        volumeSeriesRef.current.update({
          time: last.time,
          value: Math.random() * 500000 + 200000,
          color: isGreen ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 23, 68, 0.15)',
        });
      }
    }, updateMs);

    return () => clearInterval(interval);
  }, [currentPrice, selectedTF, assetType, decimals]);

  // Update indicator overlays
  const updateIndicators = useCallback((candles) => {
    if (!chartRef.current) return;

    // Remove existing indicator series
    Object.values(indicatorSeriesRef.current).forEach(series => {
      try { chartRef.current.removeSeries(series); } catch (e) {}
    });
    indicatorSeriesRef.current = {};

    if (!candles || candles.length < 20) return;

    activeIndicators.forEach(ind => {
      if (ind === 'SMA') {
        const smaData = calcSMA(candles, 20);
        const series = chartRef.current.addLineSeries({
          color: INDICATORS.SMA.color,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        series.setData(smaData);
        indicatorSeriesRef.current['SMA'] = series;
      }
      if (ind === 'EMA') {
        const emaData = calcEMA(candles, 9);
        const series = chartRef.current.addLineSeries({
          color: INDICATORS.EMA.color,
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        series.setData(emaData);
        indicatorSeriesRef.current['EMA'] = series;
      }
      if (ind === 'BB') {
        const bb = calcBB(candles, 20);
        const upperS = chartRef.current.addLineSeries({
          color: 'rgba(157, 78, 221, 0.5)',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        upperS.setData(bb.upper);
        indicatorSeriesRef.current['BB_upper'] = upperS;

        const lowerS = chartRef.current.addLineSeries({
          color: 'rgba(157, 78, 221, 0.5)',
          lineWidth: 1,
          lineStyle: 2,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        lowerS.setData(bb.lower);
        indicatorSeriesRef.current['BB_lower'] = lowerS;

        const midS = chartRef.current.addLineSeries({
          color: 'rgba(157, 78, 221, 0.3)',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        midS.setData(bb.middle);
        indicatorSeriesRef.current['BB_mid'] = midS;
      }
    });
  }, [activeIndicators]);

  // Re-apply indicators when they change
  useEffect(() => {
    updateIndicators(chartDataRef.current);
  }, [activeIndicators, updateIndicators]);

  const toggleIndicator = (ind) => {
    setActiveIndicators(prev =>
      prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
    );
  };

  const handleTimeframeChange = (tf) => {
    setSelectedTF(tf);
    if (onTimeframeChange) onTimeframeChange(tf);
  };

  return (
    <div className="w-full h-full relative">
      <div ref={chartContainerRef} className="w-full h-full" />

      {/* Timeframe Toolbar */}
      <div className="absolute top-2 left-2 flex gap-1 z-10" data-testid="chart-timeframes">
        {TIMEFRAMES.map(tf => (
          <button
            key={tf.key}
            className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-all duration-200 ${
              selectedTF === tf.key
                ? 'bg-electric text-white shadow-lg shadow-electric/30'
                : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
            }`}
            onClick={() => handleTimeframeChange(tf.key)}
            data-testid={`tf-${tf.key}`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Indicators Toolbar */}
      <div className="absolute top-2 right-2 flex gap-1.5 z-10" data-testid="chart-indicators">
        <div className="relative">
          <button
            className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-all duration-200 ${
              activeIndicators.length > 0
                ? 'bg-amber/20 text-amber border border-amber/30'
                : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10'
            }`}
            onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
            data-testid="indicators-btn"
          >
            Indicators {activeIndicators.length > 0 && `(${activeIndicators.length})`}
          </button>

          {showIndicatorMenu && (
            <div className="absolute top-8 right-0 bg-[#111827] border border-white/10 rounded-lg p-2 min-w-[160px] shadow-xl z-50">
              {Object.entries(INDICATORS).map(([key, ind]) => (
                <button
                  key={key}
                  className={`w-full text-left px-3 py-2 text-xs rounded-md transition-all flex items-center gap-2 ${
                    activeIndicators.includes(key)
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                  onClick={() => toggleIndicator(key)}
                  data-testid={`indicator-${key}`}
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: ind.color }}></span>
                  {ind.name}
                  {activeIndicators.includes(key) && <span className="ml-auto text-neon">&#10003;</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Indicators Legend */}
      {activeIndicators.length > 0 && (
        <div className="absolute top-10 left-2 flex gap-3 z-10">
          {activeIndicators.map(ind => (
            <span key={ind} className="text-[10px] font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: INDICATORS[ind]?.color || '#fff' }}></span>
              <span style={{ color: INDICATORS[ind]?.color || '#fff' }}>{INDICATORS[ind]?.name}</span>
            </span>
          ))}
        </div>
      )}

      {!asset && (
        <div className="absolute inset-0 flex items-center justify-center bg-space/80 backdrop-blur-sm">
          <p className="text-gray-500">Select an asset to view chart</p>
        </div>
      )}
    </div>
  );
};

export default TradingChart;
