const express = require('express');
const router  = express.Router();

// GET /api/services — returns all available service categories
router.get('/', (req, res) => {
  res.json({
    success: true,
    services: [
      { id: 1, name: 'Plumbing',      icon: '🔧', color: 'red'    },
      { id: 2, name: 'Electrical',    icon: '⚡', color: 'gold'   },
      { id: 3, name: 'Carpentry',     icon: '🪚', color: 'blue'   },
      { id: 4, name: 'Painting',      icon: '🖌️', color: 'green'  },
      { id: 5, name: 'Deep Cleaning', icon: '🧹', color: 'purple' },
      { id: 6, name: 'Handyman',      icon: '🔩', color: 'teal'   },
      { id: 7, name: 'Bathroom',      icon: '🚿', color: 'sky'    },
      { id: 8, name: 'AC Service',    icon: '❄️', color: 'cyan'   }
    ]
  });
});

module.exports = router;
