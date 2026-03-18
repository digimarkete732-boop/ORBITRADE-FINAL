import React, { useEffect, useRef, useState } from 'react';

const TradingChart = ({ asset, currentPrice, assetType }) => {
  const chartRef = useRef(null);
  const [candles, setCandles] = useState([]);
  
  // Generate initial candles
  useEffect(() => {
    if (!currentPrice || currentPrice === 0) return;
    
    const generateCandles = () => {
      const newCandles = [];
      let price = currentPrice;
      const volatility = assetType === 'crypto' ? 0.005 : assetType === 'metals' ? 0.002 : 0.0005;
      
      for (let i = 50; i >= 0; i--) {
        const change = (Math.random() - 0.5) * 2 * volatility * price;
        const open = price;
        const close = price + change;
        const high = Math.max(open, close) + Math.random() * volatility * price * 0.5;
        const low = Math.min(open, close) - Math.random() * volatility * price * 0.5;
        
        newCandles.push({
          time: Date.now() - i * 60000,
          open,
          high,
          low,
          close,
          bullish: close >= open
        });
        
        price = close;
      }
      
      return newCandles;
    };
    
    setCandles(generateCandles());
  }, [currentPrice, assetType, asset]);
  
  // Update last candle with current price
  useEffect(() => {
    if (!currentPrice || currentPrice === 0 || candles.length === 0) return;
    
    const interval = setInterval(() => {
      setCandles(prev => {
        if (prev.length === 0) return prev;
        
        const newCandles = [...prev];
        const lastCandle = { ...newCandles[newCandles.length - 1] };
        
        // Update close price with some randomness
        const change = (Math.random() - 0.5) * 0.002 * currentPrice;
        lastCandle.close = currentPrice + change;
        lastCandle.high = Math.max(lastCandle.high, lastCandle.close);
        lastCandle.low = Math.min(lastCandle.low, lastCandle.close);
        lastCandle.bullish = lastCandle.close >= lastCandle.open;
        
        newCandles[newCandles.length - 1] = lastCandle;
        return newCandles;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentPrice]);
  
  // Calculate price range
  const prices = candles.flatMap(c => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  
  // Scale Y coordinate
  const scaleY = (price) => {
    const padding = 40;
    const chartHeight = 400 - padding * 2;
    return padding + (1 - (price - minPrice) / priceRange) * chartHeight;
  };
  
  // Format price for display
  const formatAxisPrice = (price) => {
    if (assetType === 'forex') return price.toFixed(5);
    if (assetType === 'metals') return price.toFixed(2);
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  // Price levels for Y axis
  const priceLevels = [];
  for (let i = 0; i <= 4; i++) {
    priceLevels.push(minPrice + (priceRange * i) / 4);
  }

  return (
    <div ref={chartRef} className="w-full h-full relative bg-space-dark/50 overflow-hidden">
      {/* Grid Lines */}
      <svg className="absolute inset-0 w-full h-full">
        {priceLevels.map((_, i) => (
          <line
            key={i}
            x1="0"
            y1={40 + i * 80}
            x2="100%"
            y2={40 + i * 80}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}
      </svg>
      
      {/* Candlesticks */}
      <div className="absolute inset-0 flex items-end px-2 pb-10 pt-10">
        <div className="flex-grow flex items-end gap-[2px] h-[320px] relative">
          {candles.map((candle, i) => {
            const bodyTop = scaleY(Math.max(candle.open, candle.close));
            const bodyBottom = scaleY(Math.min(candle.open, candle.close));
            const wickTop = scaleY(candle.high);
            const wickBottom = scaleY(candle.low);
            
            return (
              <div key={i} className="flex-1 relative" style={{ minWidth: '4px', maxWidth: '12px' }}>
                {/* Wick */}
                <div 
                  className={`absolute left-1/2 w-px -translate-x-1/2 ${candle.bullish ? 'bg-neon/60' : 'bg-vibrant/60'}`}
                  style={{
                    top: `${(wickTop / 400) * 100}%`,
                    height: `${((wickBottom - wickTop) / 400) * 100}%`
                  }}
                />
                {/* Body */}
                <div 
                  className={`absolute left-0 right-0 rounded-sm ${candle.bullish ? 'bg-neon' : 'bg-vibrant'}`}
                  style={{
                    top: `${(bodyTop / 400) * 100}%`,
                    height: `${Math.max(2, ((bodyBottom - bodyTop) / 400) * 100)}%`
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Current Price Line */}
      {currentPrice > 0 && (
        <div 
          className="absolute left-0 right-0 border-t border-dashed border-neon/50"
          style={{ top: `${(scaleY(currentPrice) / 400) * 100}%` }}
        >
          <div className="absolute right-2 -top-3 bg-neon text-space text-xs font-mono px-2 py-0.5 rounded font-bold">
            {formatAxisPrice(currentPrice)}
          </div>
        </div>
      )}
      
      {/* Y Axis */}
      <div className="absolute right-0 top-0 bottom-0 w-16 border-l border-white/5 bg-space/80 backdrop-blur flex flex-col justify-between py-10 text-[10px] text-gray-500 font-mono text-right pr-2">
        {priceLevels.reverse().map((price, i) => (
          <span key={i}>{formatAxisPrice(price)}</span>
        ))}
      </div>
      
      {/* No Asset Selected */}
      {!asset && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500">Select an asset to view chart</p>
        </div>
      )}
    </div>
  );
};

export default TradingChart;
