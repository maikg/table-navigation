// Copyright (c) 2010, Maik Gosenshuis
// All rights reserved.
// 
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the copyright holder nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
// 
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL MAIK GOSENSHUIS BE LIABLE FOR ANY
// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

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
