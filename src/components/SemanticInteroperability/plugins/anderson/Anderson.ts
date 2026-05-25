export const Anderson = {
    Rules: [
        {
            id: 1,
            name: "Built up Surface, Residential",
            priority: 1,
            syntax: "Ms'Built up Surface, Residential'",
            assignment: {class_id: 2, class_name: "Residential (Urban or Built up)", class_map_code: "1-11"},
            inclusive: {
                elements: [
                    {
                        id: 1,
                        priority: 1,
                        element: 1018,
                        ruleDefinition: {
                            characteristics: [
                                {
                                    id: 1,
                                    name: "Construction Use Test",
                                    priority: 1,
                                    characteristicID: 100022,
                                    rules: {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [],
                                            or: [
                                                    {
                                                        constructionUse: [
                                                            {object: "constructionUse", lower_bound: "Residential", lower_tolerance: "", upper_bound: "Residential", upper_tolerance: "", mode: "="}
                                                        ]
                                                    }
                                            ]
                                        }
                                    }
                                }
                            ],
                            properties: [
                                {
                                    id: 1,
                                    name: "Cover Test Built up Surface, Residential",
                                    priority: 1,
                                    rules: 
                                    {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [
                                                {object: "BlockID", lower_bound: 1018, lower_tolerance: 0, upper_bound: 1018, upper_tolerance: 0, mode: "="},
                                                {object: "cover", lower_bound: 10, lower_tolerance: -10, upper_bound: 100, upper_tolerance: 0, mode: ">=<="}
                                            ],
                                            or:  [
                                                {elementPresenceType: [
                                                    {object: "elementPresenceType", lower_bound: "Fixed", lower_tolerance: "", upper_bound: "Fixed", upper_tolerance: "", mode: "="},
                                                    {object: "elementPresenceType", lower_bound: "Mandatory", lower_tolerance: "", upper_bound: "Mandatory", upper_tolerance: "", mode: "="}
                                                ]}
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ],
                strata: {
                    id: 1,
                    priority: 1,
                    name: "Strata Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "stratumID", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                horizontalPatterns: {
                    id: 1,
                    priority: 1,
                    name: "Horizontal Pattern Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "horizontal_pattern_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                classes: {
                    id: 1,
                    priority: 1,
                    name: "Class Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "class_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                }
            },
            exclusive: {
                elements: [
                ],
                strata: {
                },
                horizontalPatterns: {
                },
                classes: {
                }
            }
        },
        {
            id: 2,
            name: "Built up Surface, Commercial and Services",
            priority: 1,
            syntax: "Ms'Built up Surface, Commercial and Services'",
            assignment: {class_id: 10, class_name: "Commercial and Services (Urban or Built up)", class_map_code: "1-12"},
            inclusive: {
                elements: [
                    {
                        id: 1,
                        priority: 1,
                        element: 1018,
                        ruleDefinition: {
                            characteristics: [                                
                                {
                                    id: 1,
                                    name: "Artificial Surface Type Test",
                                    priority: 1,
                                    characteristicID: 0,
                                    rules: {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [],
                                            or: [
                                                {constructionUse: [                                                    
                                                    {object: "constructionUse", lower_bound: "Commercial", lower_tolerance: "", upper_bound: "Commercial ", upper_tolerance: "", mode: "Contains"},
                                                    {object: "constructionUse", lower_bound: "Service", lower_tolerance: "", upper_bound: "Service", upper_tolerance: "", mode: "Contains"}
                                                ]}
                                            ]
                                        }
                                    }
                                }                              
                            ],
                            properties: [
                                {
                                    id: 1,
                                    name: "Cover Test Built up Surface, Commercial and Services",
                                    priority: 1,
                                    rules: 
                                    {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [
                                                {object: "BlockID", lower_bound: 1018, lower_tolerance: 0, upper_bound: 1018, upper_tolerance: 0, mode: "="},
                                                {object: "cover", lower_bound: 80, lower_tolerance: 0, upper_bound: 100, upper_tolerance: 0, mode: ">=<="}
                                            ],
                                            or: [
                                                {elementPresenceType: [
                                                    {object: "elementPresenceType", lower_bound: "Fixed", lower_tolerance: "", upper_bound: "Fixed", upper_tolerance: "", mode: "="},
                                                    {object: "elementPresenceType", lower_bound: "Mandatory", lower_tolerance: "", upper_bound: "Mandatory", upper_tolerance: "", mode: "="}
                                                ]}                                            
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ],
                strata: {
                    id: 1,
                    priority: 1,
                    name: "Strata Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "stratumID", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                horizontalPatterns: {
                    id: 1,
                    priority: 1,
                    name: "Horizontal Pattern Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "horizontal_pattern_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                classes: {
                    id: 1,
                    priority: 1,
                    name: "Class Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "class_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                }
            },
            exclusive: {
                elements: [
                ],
                strata: {
                },
                horizontalPatterns: {
                },
                classes: {
                }
            }
        },
        {
            id: 3,
            name: "Artificial Surface, Industrial",
            priority: 1,
            syntax: "Ms'Artificial Surface, Industrial'",
            assignment: {class_id: 15,class_name: "Industrial (Urban or Built up)",class_map_code: "1-3"},
            inclusive: {
                elements: [
                    {
                        id: 1,
                        priority: 1,
                        element: 1014,
                        ruleDefinition: {
                            characteristics: [
                                {
                                    id: 1,
                                    name: "Construction Use Test",
                                    priority: 1,
                                    characteristicID: 0,
                                    rules: {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [],
                                            or: [
                                                    {
                                                        constructionUse: [
                                                            {object: "constructionUse", lower_bound: "Industrial", lower_tolerance: "", upper_bound: "Industrial", upper_tolerance: "", mode: "Contains"}
                                                        ]
                                                    }
                                            ]
                                        }
                                    }
                                }
                            ],
                            properties: [
                                {
                                    id: 1,
                                    name: "Cover Test Artificial Surface, Industrial",
                                    priority: 1,
                                    rules: 
                                    {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [
                                                {object: "BlockID", lower_bound: 1014, lower_tolerance: 0, upper_bound: 1014, upper_tolerance: 0, mode: "="},
                                                {object: "cover", lower_bound: 0, lower_tolerance: 0, upper_bound: 100, upper_tolerance: 0, mode: ">=<="}
                                            ],
                                            or:  [
                                                {elementPresenceType: [
                                                    {object: "elementPresenceType", lower_bound: "Fixed", lower_tolerance: "", upper_bound: "Fixed", upper_tolerance: "", mode: "="},
                                                    {object: "elementPresenceType", lower_bound: "Mandatory", lower_tolerance: "", upper_bound: "Mandatory", upper_tolerance: "", mode: "="}
                                                ]}
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ],
                strata: {
                    id: 1,
                    priority: 1,
                    name: "Strata Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "stratumID", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                horizontalPatterns: {
                    id: 1,
                    priority: 1,
                    name: "Horizontal Pattern Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "horizontal_pattern_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                classes: {
                    id: 1,
                    priority: 1,
                    name: "Class Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "class_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                }
            },
            exclusive: {
                elements: [
                ],
                strata: {
                },
                horizontalPatterns: {
                },
                classes: {
                }
            }
        },
        {
            id: 4,
            name: "Artificial Surface, Transport and Communication",
            priority: 1,
            syntax: "Ms'Artificial Surface, Transport and Communication Utilities'",
            assignment: {class_id: 15,class_name: "Industrial (Urban or Built up)",class_map_code: "1-3"},
            inclusive: {
                elements: [
                    {
                        id: 1,
                        priority: 1,
                        element: 1014,
                        ruleDefinition: {
                            characteristics: [
                                {
                                    id: 1,
                                    name: "Construction Use Test",
                                    priority: 1,
                                    characteristicID: 0,
                                    rules: {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [],
                                            or: [
                                                    {
                                                        constructionUse: [
                                                            {object: "constructionUse", lower_bound: "Transport", lower_tolerance: "", upper_bound: "Transport", upper_tolerance: "", mode: "Contains"},
                                                            {object: "constructionUse", lower_bound: "Communication", lower_tolerance: "", upper_bound: "Communication", upper_tolerance: "", mode: "Contains"},
                                                            {object: "constructionUse", lower_bound: "Utility", lower_tolerance: "", upper_bound: "Utility", upper_tolerance: "", mode: "Contains"}
                                                        ]
                                                    }
                                            ]
                                        }
                                    }
                                }
                            ],
                            properties: [
                                {
                                    id: 1,
                                    name: "Cover Test Artificial Surface, Industrial",
                                    priority: 1,
                                    rules: 
                                    {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [
                                                {object: "BlockID", lower_bound: 1014, lower_tolerance: 0, upper_bound: 1014, upper_tolerance: 0, mode: "="},
                                                {object: "cover", lower_bound: 0, lower_tolerance: 0, upper_bound: 100, upper_tolerance: 0, mode: ">=<="}
                                            ],
                                            or:  [
                                                {elementPresenceType: [
                                                    {object: "elementPresenceType", lower_bound: "Fixed", lower_tolerance: "", upper_bound: "Fixed", upper_tolerance: "", mode: "="},
                                                    {object: "elementPresenceType", lower_bound: "Mandatory", lower_tolerance: "", upper_bound: "Mandatory", upper_tolerance: "", mode: "="}
                                                ]}
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ],
                strata: {
                    id: 1,
                    priority: 1,
                    name: "Strata Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "stratumID", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                horizontalPatterns: {
                    id: 1,
                    priority: 1,
                    name: "Horizontal Pattern Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "horizontal_pattern_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                classes: {
                    id: 1,
                    priority: 1,
                    name: "Class Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "class_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                }
            },
            exclusive: {
                elements: [
                ],
                strata: {
                },
                horizontalPatterns: {
                },
                classes: {
                }
            }
        },
        {
            id: 5,
            name: "Artificial Surface, Commercial",
            priority: 1,
            syntax: "Ms'Artificial Surface, Commercial'",
            assignment: {class_id: 25,class_name: "Industrial and Commercial",class_map_code: "1-5"},
            inclusive: {
                elements: [
                    {
                        id: 1,
                        priority: 1,
                        element: 1014,
                        ruleDefinition: {
                            characteristics: [
                                {
                                    id: 1,
                                    name: "Construction Use Test",
                                    priority: 1,
                                    characteristicID: 0,
                                    rules: {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [],
                                            or: [
                                                    {
                                                        constructionUse: [
                                                            {object: "constructionUse", lower_bound: "Commercial", lower_tolerance: "", upper_bound: "Commercial", upper_tolerance: "", mode: "Contains"}
                                                        ]
                                                    }
                                            ]
                                        }
                                    }
                                }
                            ],
                            properties: [
                                {
                                    id: 1,
                                    name: "Cover Test Artificial Surface, Commercial",
                                    priority: 1,
                                    rules: 
                                    {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [
                                                {object: "BlockID", lower_bound: 1014, lower_tolerance: 0, upper_bound: 1014, upper_tolerance: 0, mode: "="}                                                
                                            ],
                                            or:  [
                                                {elementPresenceType: [
                                                    {object: "elementPresenceType", lower_bound: "Fixed", lower_tolerance: "", upper_bound: "Fixed", upper_tolerance: "", mode: "="},
                                                    {object: "elementPresenceType", lower_bound: "Mandatory", lower_tolerance: "", upper_bound: "Mandatory", upper_tolerance: "", mode: "="}
                                                ]}
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ],
                strata: {
                    id: 1,
                    priority: 1,
                    name: "Strata Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "stratumID", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                horizontalPatterns: {
                    id: 1,
                    priority: 1,
                    name: "Horizontal Pattern Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "horizontal_pattern_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                classes: {
                    id: 1,
                    priority: 1,
                    name: "Class Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "class_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                }
            },
            exclusive: {
                elements: [
                ],
                strata: {
                },
                horizontalPatterns: {
                },
                classes: {
                }
            }
        },
        {
            id: 6,
            name: "Artificial Surface, Cover 80 - 100%",
            priority: 1,
            syntax: "Ms'Artificial Surface, Cover 80 - 100%'",
            assignment: {class_id: 30,class_name: "Mixed Urban or Built up land",class_map_code: "1-6"},
            inclusive: {
                elements: [
                    {
                        id: 1,
                        priority: 1,
                        element: 1014,
                        ruleDefinition: {
                            characteristics: [],
                            properties: [
                                {
                                    id: 1,
                                    name: "Artificial Surface, Cover 80 - 100%",
                                    priority: 1,
                                    rules: 
                                    {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [
                                                {object: "BlockID", lower_bound: 1014, lower_tolerance: 0, upper_bound: 1014, upper_tolerance: 0, mode: "="},
                                                {object: "cover", lower_bound: 80, lower_tolerance: 0, upper_bound: 100, upper_tolerance: 0, mode: ">=<="}
                                            ],
                                            or:  [
                                                {elementPresenceType: [
                                                    {object: "elementPresenceType", lower_bound: "Fixed", lower_tolerance: "", upper_bound: "Fixed", upper_tolerance: "", mode: "="},
                                                    {object: "elementPresenceType", lower_bound: "Mandatory", lower_tolerance: "", upper_bound: "Mandatory", upper_tolerance: "", mode: "="}
                                                ]}
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ],
                strata: {
                    id: 1,
                    priority: 1,
                    name: "Strata Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "stratumID", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                horizontalPatterns: {
                    id: 1,
                    priority: 1,
                    name: "Horizontal Pattern Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "horizontal_pattern_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                classes: {
                    id: 1,
                    priority: 1,
                    name: "Class Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "class_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                }
            },
            exclusive: {
                elements: [
                ],
                strata: {
                },
                horizontalPatterns: {
                },
                classes: {
                }
            }
        },
        {
            id: 7,
            name: "Built up Surface or Non Built up Surface & Vegetation",
            priority: 1,
            syntax: "(Mih'Built up Surface' / Mih'Non Built up Surface') & (Mih'Vegetation')",
            assignment: {class_id: 34,class_name: "Other Urban or Built up land",class_map_code: "1-7"},
            inclusive: {
                elements: [
                    {
                        id: 1,
                        priority: 1,
                        element: 1018,
                        ruleDefinition: {
                            characteristics: [],
                            properties: [
                                {
                                    id: 1,
                                    name: "Built up Surface",
                                    priority: 1,
                                    rules: 
                                    {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [
                                                {object: "BlockID", lower_bound: 1018, lower_tolerance: 0, upper_bound: 1018, upper_tolerance: 0, mode: "="}
                                            ],
                                            or:  [
                                                {elementPresenceType: [
                                                    {object: "elementPresenceType", lower_bound: "Fixed", lower_tolerance: "", upper_bound: "Fixed", upper_tolerance: "", mode: "="},
                                                    {object: "elementPresenceType", lower_bound: "Mandatory", lower_tolerance: "", upper_bound: "Mandatory", upper_tolerance: "", mode: "="}
                                                ]}
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    {
                        id: 2,
                        priority: 1,
                        element: 1015,
                        ruleDefinition: {
                            characteristics: [],
                            properties: [
                                {
                                    id: 1,
                                    name: "Non Built up Surface",
                                    priority: 1,
                                    rules: 
                                    {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [
                                                {object: "BlockID", lower_bound: 1015, lower_tolerance: 0, upper_bound: 1015, upper_tolerance: 0, mode: "="}
                                            ],
                                            or:  [
                                                {elementPresenceType: [
                                                    {object: "elementPresenceType", lower_bound: "Fixed", lower_tolerance: "", upper_bound: "Fixed", upper_tolerance: "", mode: "="},
                                                    {object: "elementPresenceType", lower_bound: "Mandatory", lower_tolerance: "", upper_bound: "Mandatory", upper_tolerance: "", mode: "="}
                                                ]}
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    },
                    {
                        id: 3,
                        priority: 1,
                        element: 1001,
                        ruleDefinition: {
                            characteristics: [],
                            properties: [
                                {
                                    id: 1,
                                    name: "Vegetation",
                                    priority: 1,
                                    rules: 
                                    {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [
                                                {object: "BlockID", lower_bound: 1001, lower_tolerance: 0, upper_bound: 1001, upper_tolerance: 0, mode: "="}
                                            ],
                                            or:  [
                                                {elementPresenceType: [
                                                    {object: "elementPresenceType", lower_bound: "Fixed", lower_tolerance: "", upper_bound: "Fixed", upper_tolerance: "", mode: "="},
                                                    {object: "elementPresenceType", lower_bound: "Mandatory", lower_tolerance: "", upper_bound: "Mandatory", upper_tolerance: "", mode: "="}
                                                ]}
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ],
                strata: {
                    id: 1,
                    priority: 1,
                    name: "Strata Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 2, lower_tolerance: 0, upper_bound: 2, upper_tolerance: 0, mode: ">="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "stratumID", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                horizontalPatterns: {
                    id: 1,
                    priority: 1,
                    name: "Horizontal Pattern Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 2, lower_tolerance: 0, upper_bound: 2, upper_tolerance: 0, mode: ">="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "horizontal_pattern_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                classes: {
                    id: 1,
                    priority: 1,
                    name: "Class Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "class_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                }
            },
            exclusive: {
                elements: [
                ],
                strata: {
                },
                horizontalPatterns: {
                },
                classes: {
                }
            }
        },
        {
            id: 8,
            name: "Herbaceous growth forms, cultivated and managed vegetation",
            priority: 1,
            syntax: "Ms'Herbaceous growth forms, cultivated and managed vegetation'",
            assignment: {class_id: 44,class_name: "Cropland and Pasture",class_map_code: "2-1"},
            inclusive: {
                elements: [
                    {
                        id: 1,
                        priority: 1,
                        element: 1007,
                        ruleDefinition: {
                            characteristics: [
                                {
                                    id: 1,
                                    name: "Cultivated and managed Test",
                                    priority: 1,
                                    characteristicID: 100020,
                                    rules: {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [],
                                            or: [                                                
                                                    {
                                                        vegetationArtificiality: [
                                                            {object: "vegetationArtificiality", lower_bound: "Cultivated", lower_tolerance: "", upper_bound: "Cultivated", upper_tolerance: "", mode: "Contains"},
                                                            {object: "vegetationArtificiality", lower_bound: "Managed", lower_tolerance: "", upper_bound: "Managed", upper_tolerance: "", mode: "Contains"}
                                                        ]
                                                    }
                                            ]
                                        }
                                    }
                                }
                            ],
                            properties: [
                                {
                                    id: 1,
                                    name: "Herbaceous growth forms",
                                    priority: 1,
                                    rules: 
                                    {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [
                                                {object: "BlockID", lower_bound: 1007, lower_tolerance: 0, upper_bound: 1007, upper_tolerance: 0, mode: "="},
                                                {object: "elementPresenceType", lower_bound: "Exclusive", lower_tolerance: "", upper_bound: "Exclusive", upper_tolerance: "", mode: "="}
                                            ],
                                            or:  []
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ],
                strata: {
                    id: 1,
                    priority: 1,
                    name: "Strata Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "stratumID", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                horizontalPatterns: {
                    id: 1,
                    priority: 1,
                    name: "Horizontal Pattern Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "horizontal_pattern_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                classes: {
                    id: 1,
                    priority: 1,
                    name: "Class Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "class_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                }
            },
            exclusive: {
                elements: [
                ],
                strata: {
                },
                horizontalPatterns: {
                },
                classes: {
                }
            }
        },
        {
            id: 9,
            name: "Woody growth forms, cultivated and managed vegetation",
            priority: 1,
            syntax: "Ms'Woody growth forms, cultivated and managed vegetation'",
            assignment: {class_id: 51,class_name: "Orchards etc.",class_map_code: "2-2"},
            inclusive: {
                elements: [
                    {
                        id: 1,
                        priority: 1,
                        element: 1004,
                        ruleDefinition: {
                            characteristics: [
                                {
                                    id: 1,
                                    name: "Cultivated and managed Test",
                                    priority: 1,
                                    characteristicID: 100020,
                                    rules: {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: ">="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [],
                                            or: [                                                
                                                    {
                                                        vegetationArtificiality: [
                                                            {object: "vegetationArtificiality", lower_bound: "Cultivated", lower_tolerance: "", upper_bound: "Cultivated", upper_tolerance: "", mode: "="},
                                                            {object: "vegetationArtificiality", lower_bound: "Managed", lower_tolerance: "", upper_bound: "Managed", upper_tolerance: "", mode: "="}
                                                        ]
                                                    }
                                            ]
                                        }
                                    }
                                }
                            ],
                            properties: [
                                {
                                    id: 1,
                                    name: "Woody growth forms",
                                    priority: 1,
                                    rules: 
                                    {
                                        properties: {
                                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                                            or: []
                                        },
                                        characteristics: {
                                            and: [
                                                {object: "BlockID", lower_bound: 1004, lower_tolerance: 0, upper_bound: 1004, upper_tolerance: 0, mode: "="}
                                            ],
                                            or:  [
                                                {elementPresenceType: [
                                                    {object: "elementPresenceType", lower_bound: "Fixed", lower_tolerance: "", upper_bound: "Fixed", upper_tolerance: "", mode: "="},
                                                    {object: "elementPresenceType", lower_bound: "Mandatory", lower_tolerance: "", upper_bound: "Mandatory", upper_tolerance: "", mode: "="}
                                                ]}
                                            ]
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ],
                strata: {
                    id: 1,
                    priority: 1,
                    name: "Strata Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "stratumID", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                horizontalPatterns: {
                    id: 1,
                    priority: 1,
                    name: "Horizontal Pattern Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "horizontal_pattern_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                },
                classes: {
                    id: 1,
                    priority: 1,
                    name: "Class Inclusion",
                    rules: {
                        properties: {
                            and: [{object: "sum", lower_bound: 1, lower_tolerance: 0, upper_bound: 1, upper_tolerance: 0, mode: "="}],
                            or: []
                        },
                        characteristics: {
                            and: [{object: "class_id", lower_bound: 0, lower_tolerance: 0, upper_bound: 0, upper_tolerance: 0, mode: ">"}],
                            or: []
                        }
                    }
                }
            },
            exclusive: {
                elements: [
                ],
                strata: {
                },
                horizontalPatterns: {
                },
                classes: {
                }
            }
        }
    ],
    Classes: [
        {
            class_id: 2,
            class_name: "Residential (Urban or Built up)",
            class_map_code: "1-11"
        },
        {
            class_id: 10,
            class_name: "Commercial and Services (Urban or Built up)",
            class_map_code: "1-12"
        },
        {					
            class_id: 15,
            class_name: "Industrial (Urban or Built up)",
            class_map_code: "1-3"
        },
        {					
            class_id: 20,
            class_name: "Transportation, Communication and Utilities",
            class_map_code: "1-4"
        },
        {
            class_id: 25,
            class_name: "Industrial and Commercial",
            class_map_code: "1-5"
        },
        {
            class_id: 30,
            class_name: "Mixed Urban or Built up land",
            class_map_code: "1-6"
        },
        {
            class_id: 34,
            class_name: "Other Urban or Built up land",					
            class_map_code: "1-7"
        },
        {
            class_id: 44,
            class_name: "Cropland and Pasture",
            class_map_code: "2-1"
        },
        {
            class_id: 51,
            class_name: "Horchards etc.",
            class_map_code: "2-2"
        },
        {					
            class_id: 56,
            class_name: "Confined feeding operations",
            class_map_code: "2-3"
        },
        {					
            class_id: 63,
            class_name: "Herbaceous rangeland",
            class_map_code: "31"
        },
        {					
            class_id: 69,
            class_name: "Shrub and brush rangeland",
            class_map_code: "32"
        },
        {					
            class_id: 77,
            class_name: "Deciduous forest",
            class_map_code: "41"
        },
        {					
            class_id: 83,
            class_name: "Evergreen forest",
            class_map_code: "42"
        },
        {					
            class_id: 89,
            class_name: "Mixed forrst",
            class_map_code: "43"
        },
        {					
            class_id: 96,
            class_name: "Streams and canals",
            class_map_code: "51"
        },
        {					
            class_id: 102,
            class_name: "Lakes",
            class_map_code: "52"
        },
        {					
            class_id: 107,
            class_name: "Reservoir",
            class_map_code: "53"
        },
        {					
            class_id: 112,
            class_name: "Bay and estuaries",
            class_map_code: "54"
        },
        {					
            class_id: 118,
            class_name: "Forested wetland",
            class_map_code: "61"
        },
        {					
            class_id: 124,
            class_name: "Non forested wetlands",
            class_map_code: "62"
        },
        {					
            class_id: 133,
            class_name: "Dry salt flats",
            class_map_code: "71"
        },
        {					
            class_id: 137,
            class_name: "Beaches",
            class_map_code: "72"
        },
        {					
            class_id: 142,
            class_name: "Sandy areas other than beaches",
            class_map_code: "73"
        },
        {					
            class_id: 146,
            class_name: "Bare rock",
            class_map_code: "74"
        },
        {					
            class_id: 150,
            class_name: "Strip mines, quarries and gravel pits",
            class_map_code: "75"
        },
        {					
            class_id: 156,
            class_name: "Shrub and bush tundra",
            class_map_code: "81"
        },
        {
            class_id: 161,
            class_name: "Herbaceouse tundra",
            class_map_code: "82"
        },
        {            
            class_id: 167,
            class_name: "Wet tundra",
            class_map_code: "84"
        },
        {					
            class_id: 178,
            class_name: "Bare ground tundra",
            class_map_code: "83"
        },
        {					
            class_id: 188,
            class_name: "Perennial snowfields",
            class_map_code: "91"
        },
        {            
            class_id: 192,
            class_name: "Glaciers",
            class_map_code: "92"
        }
	]
};