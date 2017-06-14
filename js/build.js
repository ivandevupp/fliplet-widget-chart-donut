(function(){
  window.ui = window.ui || {}
  ui.flipletCharts = ui.flipletCharts || {};

  function init() {
    $('[data-chart-donut-id]').each(function (i, el) {
      var chartId = $(this).data('chart-donut-id');
      var data = Fliplet.Widget.getData( chartId );
      var $container = $(el);
      var refreshTimeout = 5000;
      var updateDateFormat = 'hh:mm:ss a';

      function resetData() {
        data.entries = [];
        data.totalEntries = 0;
        data.name = '';
      }

      function refreshData() {
        if (!data.dataSourceQuery) {
          data.entries = [
            {name: 'A', y: 3, sliced: true, selected: true},
            {name: 'B', y: 2},
            {name: 'C', y: 1}
          ];
          data.totalEntries = 6;
          return Promise.resolve()
        }
        return Fliplet.DataSources.fetchWithOptions(data.dataSourceQuery).then(function(result){
          var columns = [];
          data.entries = [];
          data.totalEntries = 0;
          if (!result.dataSource.columns.length) {
            return Promise.resolve();
          }
          switch (data.dataSourceQuery.selectedModeIdx) {
            case 0:
            default:
              data.name = data.dataSourceQuery.columns.category;
              result.dataSourceEntries.forEach(function(row, i) {
                data.entries.push({
                  name: row[data.dataSourceQuery.columns.category] || 'Category ' + (i+1),
                  y: parseInt(row[data.dataSourceQuery.columns.value]) || 0
                });
              });
              break;
            case 1:
              data.name = 'Count of ' + data.dataSourceQuery.columns.column;
              result.dataSourceEntries.forEach(function(row) {
                var value = row[data.dataSourceQuery.columns.column];
                value = $.trim(value);

                if (value.constructor.name !== 'Array') {
                  value = [value];
                }
                // Value is an array
                value.forEach(function(elem) {
                  if ( columns.indexOf(elem) === -1 ) {
                    columns.push(elem);
                    data.entries[columns.indexOf(elem)] = {
                      name: elem,
                      y: 1
                    };
                  } else {
                    data.entries[columns.indexOf(elem)].y++;
                  }
                });
              });
              break;
          }
          data.entries = _.reverse(_.sortBy(data.entries, function(o){
            return o.y;
          }));
          if (data.entries.length) {
            data.entries[0].sliced = true;
            data.entries[0].selected = true;
          }

          // SAVES THE TOTAL NUMBER OF ROW/ENTRIES
          data.totalEntries = _.reduce(data.entries, function(sum, o){
            return sum + o.y;
          }, 0);

          return Promise.resolve();
        }).catch(function(error){
          return Promise.reject(error);
        });
      }

      function refreshChartInfo() {
        // Update total count
        $container.find('.total').html(data.totalEntries);
        // Update last updated time
        $container.find('.updatedAt').html(moment().format(updateDateFormat));
      }

      function refreshChart() {
        // Retrieve chart object
        var chart = ui.flipletCharts[chartId];
        // Update values
        chart.series[0].setData(data.entries);
        refreshChartInfo();
      }

      function getLatestData() {
        setTimeout(function(){
          refreshData().then(function(){
            refreshChart();
            if (data.autoRefresh) {
              getLatestData();
            }
          });
        }, refreshTimeout);
      }

      function drawChart() {
        var colors = [
          '#337AB7', '#5BC0DE', '#5CB85C', '#F0AD4E', '#C9302C',
          '#293954', '#2E6F82', '#3D7A3D', '#B07623', '#963732'
        ];
        colors.forEach(function eachColor (color, index) {
          if (!Fliplet.Themes) {
            return;
          }
          colors[index] = Fliplet.Themes.Current.get('chartColor'+(index+1)) || color;
        });
        var chartOpt = {
          chart: {
            type: 'pie',
            plotBackgroundColor: null,
            plotBorderWidth: null,
            plotShadow: false,
            renderTo: $container.find('.chart-container')[0],
            style: {
              fontFamily: (Fliplet.Themes && Fliplet.Themes.Current.get('bodyFontFamily')) || 'sans-serif'
            },
            events: {
              load: function(){
                refreshChartInfo();
                if (data.autoRefresh) {
                  getLatestData();
                }
              }
            }
          },
          colors: colors,
          title: {
            text: ''
          },
          subtitle: {
            text: ''
          },
          tooltip: {
            pointFormat: '{series.name}: <strong>{point.percentage:.1f}%</strong> '
          },
          plotOptions: {
            pie: {
              allowPointSelect: true,
              cursor: 'pointer',
              dataLabels: {
                enabled: data.showDataValues,
                format: [
                  (!data.showDataLegend ? '<strong>{point.name}</strong>: ' : ''),
                  '{point.y}'
                ].join(''),
                style: {
                  color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
                }
              },
              showInLegend: data.showDataLegend
            }
          },
          series: [{
            name: data.name,
            colorByPoint: true,
            innerSize: '38%',
            data: data.entries
          }],
          credits: {
            enabled: false
          }
        };
        // Create and save chart object
        ui.flipletCharts[chartId] = new Highcharts.Chart(chartOpt);
      }

      refreshData().then(drawChart).catch(function(error){
        console.error(error);
      });
    });
  }

  Fliplet().then(function(){
    var debounceLoad = _.debounce(init, 500);
    Fliplet.Studio.onEvent(function (event) {
      if (event.detail.event === 'reload-widget-instance') {
        debounceLoad();
      }
    });

    init();
  });
})();
