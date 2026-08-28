package com.project.codeEditor.dto;

public class MoveFileNodeRequest {

    // New parent folder id. Null moves the node to the root.
    private Long newParentId;
    // Optional — new position among the target parent's children.
    private Integer newSortOrder;

    public Long getNewParentId() { return newParentId; }
    public void setNewParentId(Long newParentId) { this.newParentId = newParentId; }

    public Integer getNewSortOrder() { return newSortOrder; }
    public void setNewSortOrder(Integer newSortOrder) { this.newSortOrder = newSortOrder; }
}
