<template>
  <div class="dashboard-container">
    <h4 class="mb-4 fw-bold text-secondary">系统运行状态</h4>

    <div class="row g-4 mb-4">
      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100 stats-card border-start-primary">
          <div class="card-body">
            <div class="d-flex align-items-center mb-3">
              <div class="icon-box bg-primary-subtle text-primary rounded-circle me-3">
                <i class="bi bi-people-fill"></i>
              </div>
              <h6 class="card-title mb-0 text-muted">用户总览</h6>
            </div>
            <div class="d-flex justify-content-between text-center">
              <div>
                <h3 class="fw-bold mb-0">{{ stats.userNumber || 0 }}</h3>
                <small class="text-muted">总用户数</small>
              </div>
              <div class="border-start ps-4">
                <h3 class="fw-bold mb-0 text-success">{{ stats.todayActiveUserCount || 0 }}</h3>
                <small class="text-muted">今日活跃</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100 stats-card border-start-info">
          <div class="card-body">
            <div class="d-flex align-items-center mb-3">
              <div class="icon-box bg-info-subtle text-info rounded-circle me-3">
                <i class="bi bi-chat-dots-fill"></i>
              </div>
              <h6 class="card-title mb-0 text-muted">问答核心</h6>
            </div>
            <div class="d-flex justify-content-between text-center">
              <div>
                <h3 class="fw-bold mb-0">{{ stats.todayActiveChatCount || 0 }}</h3>
                <small class="text-muted">今日问答</small>
              </div>
              <div class="border-start ps-4">
                <h3 class="fw-bold mb-0">{{ stats.totalChatCount || 0 }}</h3>
                <small class="text-muted">累计问答</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100 stats-card border-start-warning">
          <div class="card-body">
            <div class="d-flex align-items-center mb-3">
              <div class="icon-box bg-warning-subtle text-warning rounded-circle me-3">
                <i class="bi bi-database-fill"></i>
              </div>
              <h6 class="card-title mb-0 text-muted">知识库状态</h6>
            </div>
            <div class="row text-center g-2">
              <div class="col-4">
                <h4 class="fw-bold mb-0">{{ stats.documentCount || 0 }}</h4>
                <small class="text-muted" style="font-size: 0.75rem">文档总数</small>
              </div>
              <div class="col-4 border-start border-end">
                <h4 class="fw-bold mb-0 text-danger">{{ stats.documentFailureCount || 0 }}</h4>
                <small class="text-muted" style="font-size: 0.75rem">待处理/失败/删除</small>
              </div>
              <div class="col-4">
                <h4 class="fw-bold mb-0 text-primary">{{ formatNumber(stats.embeddingCount) }}</h4>
                <small class="text-muted" style="font-size: 0.75rem">向量条数</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-md-8">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white border-0 pt-4 px-4">
            <h6 class="fw-bold mb-0"><i class="bi bi-graph-up me-2"></i>近7日数据趋势</h6>
          </div>
          <div class="card-body">
            <div ref="trendChartRef" style="width: 100%; height: 350px;"></div>
          </div>
        </div>
      </div>

      <div class="col-md-4">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-header bg-white border-0 pt-4 px-4">
            <h6 class="fw-bold mb-0"><i class="bi bi-pie-chart-fill me-2"></i>用户标签/部门分布</h6>
          </div>
          <div class="card-body d-flex align-items-center justify-content-center">
            <div ref="pieChartRef" style="width: 100%; height: 350px;"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import request from '@/utilis/requests';
import * as echarts from 'echarts';

const stats = ref({});
const trendChartRef = ref(null);
const pieChartRef = ref(null);
let trendChart = null;
let pieChart = null;

// 格式化大数字 (例如 12000 -> 1.2k)
const formatNumber = (num) => {
  if (!num) return 0;
  return num > 1000 ? (num / 1000).toFixed(1) + 'k' : num;
};

const fetchDashboardData = async () => {
  try {
    const res = await request.get('/user/dashboard');
    if (res.data.code === 200) {
      stats.value = res.data.data;
      await nextTick();
      initCharts();
    }
  } catch (err) {
    console.error("获取仪表盘数据失败", err);
  }
};

const safeJsonParse = (str, defaultVal = []) => {
  try {
    return str ? JSON.parse(str) : defaultVal;
  } catch (e) {
    console.warn("JSON Parse Error for string:", str);
    return defaultVal;
  }
};

const initCharts = () => {
  // 1. 准备数据
  // 解析后端传来的 JSON 字符串
  const docDaily = safeJsonParse(stats.value.sevenDaysDailyDocCount);
  const chatDaily = safeJsonParse(stats.value.sevenDaysDailyChatCount);
  const tagStats = safeJsonParse(stats.value.tagsCountAndNames); // 注意：后端需确保这是有效JSON

  // 提取日期轴 (假设两个数组日期一致，取其一)
  const dates = docDaily.map(item => item.date || item.key); // 兼容后端可能的字段名
  const docValues = docDaily.map(item => item.count || item.value);
  const chatValues = chatDaily.map(item => item.count || item.value);

  // 2. 渲染趋势图 (折线图)
  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value);
    trendChart.setOption({
      tooltip: { trigger: 'axis' },
      legend: { data: ['文档上传数', '问答次数'], bottom: 0 },
      grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: dates },
      yAxis: { type: 'value' },
      series: [
        {
          name: '文档上传数',
          type: 'line',
          smooth: true,
          data: docValues,
          itemStyle: { color: '#4f46e4' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{offset: 0, color: '#4f46e466'}, {offset: 1, color: '#4f46e400'}]) }
        },
        {
          name: '问答次数',
          type: 'line',
          smooth: true,
          data: chatValues,
          itemStyle: { color: '#10b981' },
          areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{offset: 0, color: '#10b98166'}, {offset: 1, color: '#10b98100'}]) }
        }
      ]
    });
  }

  // 3. 渲染分布图 (饼图)
  if (pieChartRef.value) {
    pieChart = echarts.init(pieChartRef.value);
    // 转换数据格式为 { name: 'xxx', value: 123 }
    const pieData = tagStats.map(item => ({
      name: item.tagName || '未知',
      value: item.count || 0
    }));

    pieChart.setOption({
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, left: 'center' },
      series: [
        {
          name: '标签分布',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: { show: false, position: 'center' },
          emphasis: {
            label: { show: true, fontSize: 20, fontWeight: 'bold' }
          },
          data: pieData
        }
      ]
    });
  }
};

// 监听窗口大小变化重绘图表
const handleResize = () => {
  trendChart?.resize();
  pieChart?.resize();
};

onMounted(() => {
  fetchDashboardData();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  trendChart?.dispose();
  pieChart?.dispose();
});
</script>

<style scoped>
.dashboard-container {
  max-width: 1400px;
  margin: 0 auto;
}

.stats-card {
  transition: transform 0.2s;
  overflow: hidden;
}

.stats-card:hover {
  transform: translateY(-5px);
}

/* 左侧装饰条 */
.border-start-primary { border-left: 4px solid #4f46e4 !important; }
.border-start-info { border-left: 4px solid #0dcaf0 !important; }
.border-start-warning { border-left: 4px solid #ffc107 !important; }

.icon-box {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

/* 覆盖 ECharts 容器可能的高度塌陷 */
.card-body {
  position: relative;
}
</style>