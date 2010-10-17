// Requires Prototype 1.6.1
// Doesn't work with nested tables (yet)

(function() {
  var tableMethods = {
    cellAt: function(table, r, c) {
      var matrix = getExpandedMatrix($(table));
  
      if (!Object.isArray(matrix[r])) {
        return undefined;
      }
  
      return matrix[r][c];
    },
    
    expandedSize: function(table) {
      var matrix = getExpandedMatrix($(table));
      
      return {
        width: matrix[0] ? matrix[0].size() : 0,
        height: matrix.size()
      };
    }
  };
  
  Element.addMethods('TABLE', tableMethods);
  
  
  function getExpandedMatrix(table) {
    var key   = 'expanded-matrix',
        index = table.retrieve(key);
    
    if (!index) {
      index = buildExpandedMatrix(table);
      table.store(key, index);
    }
    
    return index;
  }
  
  
  function buildExpandedMatrix(table) {
    var rows        = table.select('tr'),
        // Initialize the first row, if any, so the width of consequent rows can be based
        // on this one.
        matrix      = rows[0] ? [fillArray(calculateFirstRowSize(rows[0]), null)] : [];
    
    rows.each(function(row, rowIndex) {
      var colIndex = 0;
      
      // Account for leading cells from previous iterations that span multiple rows.
      if (Object.isArray(matrix[rowIndex])) {
        while (matrix[rowIndex][colIndex]) {
          colIndex += 1;
        }
      }
      
      row.childElements().inject(colIndex, expandCellIntoMatrix.curry(matrix, rowIndex));
    });
    
    return matrix;
  }
  
  
  function expandCellIntoMatrix(matrix, rowIndex, colIndex, cell) {
    var colspan = parseInt(cell.readAttribute('colspan') || 1, 10),
        rowspan = parseInt(cell.readAttribute('rowspan') || 1, 10);

    for (var c = colIndex, targetCol = colIndex + colspan; c < targetCol; c++) {
      for (var r = rowIndex, targetRow = rowIndex + rowspan; r < targetRow; r++) {
        // Initialize the rows lazily so we don't have to calculate up front how tall
        // our matrix will be.
        if (!Object.isArray(matrix[r])) {
          matrix[r] = fillArray(matrix[0].size(), null);
        }

        // If we try to set a certain location in our index multiple times, there has
        // to be something wrong with the markup. We can't take a guess when this happens.
        if (Object.isElement(matrix[r][c])) {
          throw "Cell at #{row},#{column} already occupied. Invalid markup.".interpolate({
            row: r,
            column: c
          });
        }
        
        matrix[r][c] = cell;
      }
      
      colIndex += 1;
    }

    // Check if we don't stumble upon a cell from an earlier row that spans multiple rows.
    while (matrix[rowIndex][colIndex]) {
      colIndex += 1;
    }
    
    return colIndex;
  }
  
  
  function calculateFirstRowSize(row) {
    return row.childElements().inject(0, function(size, cell) {
      return size + parseInt(cell.readAttribute('colspan') || 1, 10);
    });
  }
  
  
  function fillArray(width, placeholder) {
    var result = [];
    
    for (var i = 0; i < width; i++) {
      result.push(placeholder);
    }
    
    return result;
  }
})();
