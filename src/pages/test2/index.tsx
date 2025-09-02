// BiomeGenerator.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './index.css';

// 生物群系配置
const BIOMES = {
    FOREST: { name: '森林', color: '#228B22', icon: '🌲' },
    DESERT: { name: '沙漠', color: '#F4A460', icon: '🏜️' },
    OCEAN: { name: '海洋', color: '#4169E1', icon: '🌊' },
    MOUNTAIN: { name: '山地', color: '#708090', icon: '⛰️' },
    PLAINS: { name: '平原', color: '#9ACD32', icon: '🌾' }
};

const BiomeGenerator = () => {
    // 状态管理
    const [grid, setGrid] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generation, setGeneration] = useState(0);
    const [config, setConfig] = useState({
        moistureSpread: 30,
        temperatureSpread: 25,
        climateStability: 40,
        baseRate: 20,
        gridSize: 10
    });
    const [stats, setStats] = useState({});

    // 初始化网格
    const initializeGrid = useCallback(() => {
        const size = config.gridSize;
        const newGrid = Array(size).fill(null).map(() =>
            Array(size).fill(null).map(() => ({
                biome: null,
                moisture: 0,
                temperature: 0,
                stability: 0
            }))
        );

        // 世界种子 - 在(0,0)随机生成一个生物群系
        const biomeTypes = Object.keys(BIOMES);
        const seedBiome = biomeTypes[Math.floor(Math.random() * biomeTypes.length)];
        newGrid[0][0].biome = seedBiome;

        return newGrid;
    }, [config.gridSize]);

    // 计算气候影响
    const calculateClimateInfluence = useCallback((grid, x, y) => {
        const size = grid.length;
        let moisture = 0;
        let temperature = 0;
        let stability = 0;

        // 西侧相邻区块的气候影响 (moisture)
        if (x > 0 && grid[y][x - 1].biome) {
            moisture += config.moistureSpread;
        }

        // 北侧相邻区块的气候影响 (temperature)
        if (y > 0 && grid[y - 1][x].biome) {
            temperature += config.temperatureSpread;
        }

        // 气候稳定区影响
        if (x > 0 && y > 0 &&
            grid[y][x - 1].biome && grid[y - 1][x].biome &&
            grid[y][x - 1].biome === grid[y - 1][x].biome) {
            stability += config.climateStability;
        }

        return { moisture, temperature, stability };
    }, [config]);

    // 确定生物群系类型
    const determineBiome = useCallback((climate) => {
        const { moisture, temperature, stability } = climate;
        const totalInfluence = moisture + temperature + stability + config.baseRate;

        // 根据气候条件确定生物群系
        if (stability > 50) {
            // 气候稳定区域，继承相邻生物群系
            return Math.random() < 0.8 ? 'FOREST' : 'PLAINS';
        }

        if (moisture > temperature) {
            return moisture > 40 ? 'OCEAN' : 'FOREST';
        } else if (temperature > moisture) {
            return temperature > 40 ? 'DESERT' : 'MOUNTAIN';
        } else {
            return 'PLAINS';
        }
    }, [config.baseRate]);

    // 生成单步
    const generateStep = useCallback(() => {
        setGrid(prevGrid => {
            const newGrid = prevGrid.map(row => row.map(cell => ({ ...cell })));
            const size = newGrid.length;
            let hasChanges = false;

            for (let y = 0; y < size; y++) {
                for (let x = 0; x < size; x++) {
                    if (!newGrid[y][x].biome) {
                        const climate = calculateClimateInfluence(newGrid, x, y);
                        const totalInfluence = climate.moisture + climate.temperature + climate.stability;

                        // 基础生成概率 + 气候影响
                        const generationChance = config.baseRate + totalInfluence;

                        if (Math.random() * 100 < generationChance) {
                            newGrid[y][x].biome = determineBiome(climate);
                            newGrid[y][x].moisture = climate.moisture;
                            newGrid[y][x].temperature = climate.temperature;
                            newGrid[y][x].stability = climate.stability;
                            hasChanges = true;
                        }
                    }
                }
            }

            return hasChanges ? newGrid : prevGrid;
        });
    }, [calculateClimateInfluence, determineBiome, config.baseRate]);

    // 计算统计信息
    const calculateStats = useCallback((grid) => {
        const stats = {};
        let totalCells = 0;
        let filledCells = 0;

        grid.forEach(row => {
            row.forEach(cell => {
                totalCells++;
                if (cell.biome) {
                    filledCells++;
                    stats[cell.biome] = (stats[cell.biome] || 0) + 1;
                }
            });
        });

        const percentage = {};
        Object.keys(stats).forEach(biome => {
            percentage[biome] = ((stats[biome] / totalCells) * 100).toFixed(1);
        });

        return {
            counts: stats,
            percentages: percentage,
            completion: ((filledCells / totalCells) * 100).toFixed(1)
        };
    }, []);

    // 自动生成
    const startAutoGeneration = useCallback(() => {
        setIsGenerating(true);
        const interval = setInterval(() => {
            generateStep();
            setGeneration(prev => prev + 1);
        }, 200);

        // 检查是否完成
        const checkCompletion = setInterval(() => {
            setGrid(currentGrid => {
                const completion = calculateStats(currentGrid).completion;
                if (parseFloat(completion) >= 100) {
                    clearInterval(interval);
                    clearInterval(checkCompletion);
                    setIsGenerating(false);
                }
                return currentGrid;
            });
        }, 500);

        return () => {
            clearInterval(interval);
            clearInterval(checkCompletion);
            setIsGenerating(false);
        };
    }, [generateStep, calculateStats]);

    // 重置世界
    const resetWorld = useCallback(() => {
        setGrid(initializeGrid());
        setGeneration(0);
        setIsGenerating(false);
    }, [initializeGrid]);

    // 初始化
    useEffect(() => {
        setGrid(initializeGrid());
    }, [initializeGrid]);

    // 更新统计信息
    useEffect(() => {
        if (grid.length > 0) {
            setStats(calculateStats(grid));
        }
    }, [grid, calculateStats]);

    return (
        <div className="biome-generator">
            <div className="header">
                <h1>🌍 生物群系生成系统</h1>
                <div className="generation-info">
                    <span>第 {generation} 代</span>
                    <span>完成度: {stats.completion || 0}%</span>
                </div>
            </div>

            {/* 控制面板 */}
            <div className="control-panel">
                <div className="config-section">
                    <h3>气候参数配置</h3>
                    <div className="config-grid">
                        <div className="config-item">
                            <label>湿度传播强度: {config.moistureSpread}%</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={config.moistureSpread}
                                onChange={(e) => setConfig(prev => ({
                                    ...prev,
                                    moistureSpread: parseInt(e.target.value)
                                }))}
                                disabled={isGenerating}
                            />
                        </div>

                        <div className="config-item">
                            <label>温度传播强度: {config.temperatureSpread}%</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={config.temperatureSpread}
                                onChange={(e) => setConfig(prev => ({
                                    ...prev,
                                    temperatureSpread: parseInt(e.target.value)
                                }))}
                                disabled={isGenerating}
                            />
                        </div>

                        <div className="config-item">
                            <label>气候稳定性: {config.climateStability}%</label>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={config.climateStability}
                                onChange={(e) => setConfig(prev => ({
                                    ...prev,
                                    climateStability: parseInt(e.target.value)
                                }))}
                                disabled={isGenerating}
                            />
                        </div>

                        <div className="config-item">
                            <label>基础生成率: {config.baseRate}%</label>
                            <input
                                type="range"
                                min="5"
                                max="50"
                                value={config.baseRate}
                                onChange={(e) => setConfig(prev => ({
                                    ...prev,
                                    baseRate: parseInt(e.target.value)
                                }))}
                                disabled={isGenerating}
                            />
                        </div>
                    </div>
                </div>

                <div className="action-buttons">
                    <button
                        onClick={startAutoGeneration}
                        disabled={isGenerating}
                        className="primary-btn"
                    >
                        {isGenerating ? '生成中...' : '开始生成'}
                    </button>

                    <button
                        onClick={generateStep}
                        disabled={isGenerating}
                        className="secondary-btn"
                    >
                        单步生成
                    </button>

                    <button
                        onClick={resetWorld}
                        disabled={isGenerating}
                        className="reset-btn"
                    >
                        重置世界
                    </button>
                </div>
            </div>

            {/* 世界网格 */}
            <div className="world-container">
                <div
                    className="world-grid"
                    style={{
                        gridTemplateColumns: `repeat(${config.gridSize}, 1fr)`,
                        gridTemplateRows: `repeat(${config.gridSize}, 1fr)`
                    }}
                >
                    {grid.map((row, y) =>
                        row.map((cell, x) => (
                            <div
                                key={`${x}-${y}`}
                                className={`grid-cell ${cell.biome ? 'filled' : 'empty'}`}
                                style={{
                                    backgroundColor: cell.biome ? BIOMES[cell.biome].color : '#f0f0f0',
                                    opacity: cell.biome ? 1 : 0.3
                                }}
                                title={`(${x},${y}) ${cell.biome ? BIOMES[cell.biome].name : '未生成'}
湿度: ${cell.moisture}% 温度: ${cell.temperature}% 稳定性: ${cell.stability}%`}
                            >
                                <span className="cell-icon">
                                    {cell.biome ? BIOMES[cell.biome].icon : ''}
                                </span>
                                <span className="cell-coords">{x},{y}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* 统计信息 */}
            <div className="stats-panel">
                <h3>生物群系统计</h3>
                <div className="biome-stats">
                    {Object.entries(BIOMES).map(([key, biome]) => (
                        <div key={key} className="stat-item">
                            <div
                                className="stat-color"
                                style={{ backgroundColor: biome.color }}
                            ></div>
                            <span className="stat-icon">{biome.icon}</span>
                            <span className="stat-name">{biome.name}</span>
                            <span className="stat-count">
                                {stats.counts?.[key] || 0}
                                ({stats.percentages?.[key] || 0}%)
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* 图例 */}
            <div className="legend">
                <h4>生物群系图例</h4>
                <div className="legend-items">
                    {Object.entries(BIOMES).map(([key, biome]) => (
                        <div key={key} className="legend-item">
                            <div
                                className="legend-color"
                                style={{ backgroundColor: biome.color }}
                            ></div>
                            <span>{biome.icon} {biome.name}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BiomeGenerator;
