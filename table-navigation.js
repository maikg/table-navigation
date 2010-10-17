// Requires Prototype 1.6.1
// Doesn't work with nested tables (yet)

(function() {
  Element.addMethods('TABLE', {    
    expand: function(table) {
      var key     = 'expanded-matrix',
          matrix  = table.retrieve(key);

      if (!matrix) {
        matrix = buildExpandedMatrix(table);
        table.store(key, matrix);
      }

      return matrix;
    }
  });
  
  
  Element.addMethods(['TD','TH'], {
    cellUp: getAdjacentCell.curry(-1, 0),
    cellDown: getAdjacentCell.curry(1, 0),
    cellLeft: getAdjacentCell.curry(0, -1),
    cellRight: getAdjacentCell.curry(0, 1)
  });
  
  
  function buildExpandedMatrix(table) {
    var rows        = table.select('tr'),
        matrixWidth = rows[0] ? calculateFirstRowSize(rows[0]) : 0,
        matrix      = [],
        positions   = $H();
    
    rows.each(function(row, rowIndex) {
      var colIndex = 0;
      
      // Account for leading cells from previous iterations that span multiple rows.
      if (Object.isArray(matrix[rowIndex])) {
        while (matrix[rowIndex][colIndex]) {
          colIndex += 1;
        }
      }
      
      row.childElements().each(function(cell) {
        var colspan = parseInt(cell.readAttribute('colspan') || 1, 10),
            rowspan = parseInt(cell.readAttribute('rowspan') || 1, 10),
            cellId  = cell.identify();

        for (var c = colIndex, targetCol = colIndex + colspan; c < targetCol; c++) {
          for (var r = rowIndex, targetRow = rowIndex + rowspan; r < targetRow; r++) {
            // Initialize the rows lazily so we don't have to calculate up front how tall
            // our matrix will be.
            if (!Object.isArray(matrix[r])) {
              matrix[r] = fillArray(matrixWidth, null);
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
            
            // Keep track of all positions the cell occupies in the expanded table.
            (positions.get(cellId) || positions.set(cellId, [])).push({ row: r, column: c });
          }

          colIndex += 1;
        }

        // Check if we don't stumble upon a cell from an earlier row that spans multiple rows.
        while (matrix[rowIndex][colIndex]) {
          colIndex += 1;
        }
      });
    });
    
    // The public API of the expanded matrix object.
    return {
      get: function(r, c) {
        if (typeof r === 'object') {
          c = r.column;
          r = r.row;
        }
        
        if (!Object.isArray(matrix[r])) {
          return undefined;
        }

        return matrix[r][c];
      },
      
      size: function() {
        return {
          width: matrix[0] ? matrix[0].size() : 0,
          height: matrix.size()
        };
      },
      
      positions: function(cell) {
        return positions.get(cell.identify());
      }
    };
  }
  
  
  function getAdjacentCell(rowDelta, columnDelta, cell) {
    var expandedMatrix = cell.up('table').expand(),
        position;
    
    position = expandedMatrix.positions(cell).sort(function(a, b) {
      var result = 0;
      result += (rowDelta <= 0) ? a.row - b.row : b.row - a.row;
      result += (columnDelta <= 0) ? a.column - b.column : b.column - a.column;
      return result;
    }).first();
    
    return expandedMatrix.get(position.row + rowDelta, position.column + columnDelta);
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
