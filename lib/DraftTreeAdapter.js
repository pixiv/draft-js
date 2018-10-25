'use strict';

var _assign = require('object-assign');

var _extends = _assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @format
 *  strict-local
 * @emails oncall+draft_js
 *
 * This is unstable and not part of the public API and should not be used by
 * production systems. This file may be update/removed without notice.
 */

var generateRandomKey = require('./generateRandomKey');
var invariant = require('fbjs/lib/invariant');

var traverseInDepthOrder = function traverseInDepthOrder(blocks, fn) {
  var stack = [].concat(blocks).reverse();
  while (stack.length) {
    var _block = stack.pop();

    fn(_block);

    var children = _block.children;

    !Array.isArray(children) ? process.env.NODE_ENV !== 'production' ? invariant(false, 'Invalid tree raw block') : invariant(false) : void 0;

    stack = stack.concat([].concat(children.reverse()));
  }
};

var isListBlock = function isListBlock(block) {
  if (!(block && block.type)) {
    return false;
  }
  var type = block.type;

  return type === 'unordered-list-item' || type === 'ordered-list-item';
};

var addDepthToChildren = function addDepthToChildren(block) {
  if (Array.isArray(block.children)) {
    block.children = block.children.map(function (child) {
      return child.type === block.type ? _extends({}, child, { depth: (block.depth || 0) + 1 }) : child;
    });
  }
};

/**
 * This adapter is intended to be be used as an adapter to draft tree data
 *
 * draft state <=====> draft tree state
 */
var DraftTreeAdapter = {
  /**
   * Converts from a tree raw state back to draft raw state
   */
  fromRawTreeStateToRawState: function fromRawTreeStateToRawState(draftTreeState) {
    var blocks = draftTreeState.blocks;

    var transformedBlocks = [];

    !Array.isArray(blocks) ? process.env.NODE_ENV !== 'production' ? invariant(false, 'Invalid raw state') : invariant(false) : void 0;

    if (!Array.isArray(blocks) || !blocks.length) {
      return draftTreeState;
    }

    traverseInDepthOrder(blocks, function (block) {
      var newBlock = _extends({}, block);

      if (isListBlock(block)) {
        newBlock.depth = newBlock.depth || 0;
        addDepthToChildren(block);

        // if it's a non-leaf node, we don't do anything else
        if (block.children != null && block.children.length > 0) {
          return;
        }
      }

      delete newBlock.children;

      transformedBlocks.push(newBlock);
    });

    draftTreeState.blocks = transformedBlocks;

    return _extends({}, draftTreeState, {
      blocks: transformedBlocks
    });
  },


  /**
   * Converts from draft raw state to tree draft state
   */
  fromRawStateToRawTreeState: function fromRawStateToRawTreeState(draftState) {
    var transformedBlocks = [];
    var parentStack = [];

    draftState.blocks.forEach(function (block) {
      var isList = isListBlock(block);
      var depth = block.depth || 0;
      var treeBlock = _extends({}, block, {
        children: []
      });

      if (!isList) {
        transformedBlocks.push(treeBlock);
        return;
      }

      var lastParent = parentStack[0];
      // block is non-nested & there are no nested blocks, directly push block
      if (lastParent == null && depth === 0) {
        transformedBlocks.push(treeBlock);
        // block is first nested block or previous nested block is at a lower level
      } else if (lastParent == null || lastParent.depth < depth - 1) {
        // create new parent block
        var newParent = {
          key: generateRandomKey(),
          text: '',
          depth: depth - 1,
          type: block.type,
          children: [],
          entityRanges: [],
          inlineStyleRanges: []
        };

        parentStack.unshift(newParent);
        if (depth === 1) {
          // add as a root-level block
          transformedBlocks.push(newParent);
        } else if (lastParent != null) {
          // depth > 1 => also add as previous parent's child
          lastParent.children.push(newParent);
        }
        newParent.children.push(treeBlock);
      } else if (lastParent.depth === depth - 1) {
        // add as child of last parent
        lastParent.children.push(treeBlock);
      } else {
        // pop out parents at levels above this one from the parent stack
        while (lastParent != null && lastParent.depth >= depth) {
          parentStack.shift();
          lastParent = parentStack[0];
        }
        if (depth > 0) {
          lastParent.children.push(treeBlock);
        } else {
          transformedBlocks.push(treeBlock);
        }
      }
    });

    return _extends({}, draftState, {
      blocks: transformedBlocks
    });
  }
};

module.exports = DraftTreeAdapter;